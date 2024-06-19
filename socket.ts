// @ts-nocheck

import { Server } from 'socket.io'
import "dotenv/config"
import cron from 'node-cron'
import helmet from 'helmet'
import compression from "compression"
import { getUserData } from './controllers/Account'
import coinflip from './models/coinflip'
import { AnyMap } from './modules/special_types'
import chat from './models/chat'
import { DELETE_DEAD_COINFLIPS } from './config/config'
import account from './models/account'

class MessageStoreApi {
    msgs: any[] = []

    constructor(msgs?: any[]) {
        if (msgs) {
            this.msgs = msgs
        }
    }

    push(a: any) {
        this.msgs.push(a)
    }

    length() {
        return this.msgs.length
    }

    all() {
        return this.msgs
    }
}

function isNumeric(num){
    return !isNaN(num)
}


async function checktip(user, spec, socket){
    try{
        if(spec[0] == "/tip" && spec[1] && spec[2] && isNumeric(spec[2])){
            const target = await account.findOne({username: spec[1]});
    
            if(!target){
                return {
                    toast: "fail",
                    message: "Target not found."
                }
            }
    
            const amount = parseInt(spec[2]);
    
            if(amount > user.balance){
                return {
                    toast: "fail",
                    message: "not enough balance"
                }
            }
    
            target.balance += amount;
            user.balance -= amount;
            await target.save();
            await user.save();
            
            socket.emit('BALANCE_UPDATE', user.balance)

            return {
                toast: "success",
                message: `Sent ${spec[1]} ${amount}$ tip.`,
                reciever: target.username,
                reciever_msg: `Recieved ${amount}$ tip from ${user.username}.`
            }
        }else {
            return {
                toast: "fail",
                message: "invalid."
            }
        }
    }catch(er){
        console.log(er)
        return {
            toast: "fail",
            message: "Something went wrong."
        }
    }
   
}

export default async function SocketServer(httpServer: any) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    })

    io.engine.use(helmet())
    io.engine.use(compression())

    io.on('connection', async (socket) => {
        socket.on('bcast', async (data) => {
            try {
                // await socketLimiter.consume(socket.handshake.address); // consume 1 point per event from IP
                socket.emit('news', { 'data': data });
                socket.broadcast.emit('news', { 'data': data });
            } catch (rejRes: Error | any) {
                // no available points to consume
                // emit error or warning message
                socket.emit('blocked', { 'retry-ms': rejRes.msBeforeNext });
            }
        });

        const latestChats = await chat.find().sort({ date: -1 }).limit(100);
        socket.emit('LOAD_MESSAGES', latestChats);

        const loadCoinflips = await coinflip.find({}, { serverSeed: 0 }).sort({ value: -1 })
        socket.emit('NEW_COINFLIP', loadCoinflips)
        socket.on('NEW_COINFLIP', async () => {
            const activeCoinflips = await coinflip.find({}, { serverSeed: 0 }).sort({ value: -1 })
            io.emit('NEW_COINFLIP', activeCoinflips)
        })

        socket.on('COINFLIP_UPDATE', async (id) => {
            const newData: AnyMap | null = await coinflip.findOne({ _id: id })

            if (newData != null) {
                if (newData.winnerCoin != null) {
                    io.emit('COINFLIP_UPDATE', await coinflip.findOne({ _id: id }))
                    io.emit('NEW_COINFLIP', await coinflip.find({}, { serverSeed: 0 }).sort({ value: -1 }))
                }
            }
        })

        io.emit('USER_COUNT', io.engine.clientsCount)

        // NEW MESSAGE RECEIVED FROM A USER
        socket.on('SEND_MESSAGE', async (data) => {
            const sender = await getUserData(data.author)
            if (sender == null) return

            const spec = data.message.split(" ");

            let extra = null;

            if(spec[0] == "/tip"){
                extra = await checktip(sender, spec, socket)
            }

            const response = {
                author: {
                    username: sender.username,
                    role: sender.role,
                    avatarId: sender.headshot
                },
                message: data.message,
                date: new Date(),
                extra
            }

            io.emit('NEW_MESSAGE', response)
            const chat_record = await new chat(response).save()
            console.log(`[${chat_record.date}] ${sender.username}:`, chat_record)
        })

        socket.on('BALANCE_UPDATE', async (user: string) => {
            const newBalance = await getUserData(user)
            if (newBalance != undefined) {
                socket.emit('BALANCE_UPDATE', newBalance.balance)
            }
        })
    })

    if (DELETE_DEAD_COINFLIPS) {
        console.log(`[CRON SCHEDULE]: DeleteMany Cron Job Started, Old Coinflips Will Be Deleted Momentarily.`)
        cron.schedule('* * * * *', async () => {
            await coinflip.deleteMany({ endedAt: { $lt: new Date().getTime() - 90000 } })
                .then(_ => {
                    console.log('[CRON SCHEDULE]: DeteleMany Executed. Dead Coinflips Deleted From Database')
                })

            io.emit('NEW_COINFLIP', await coinflip.find({}, { serverSeed: 0 }).sort({ value: -1 }))
        })
    }
}

