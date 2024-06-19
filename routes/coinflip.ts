import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import express from 'express';
import crypto from "crypto"
import { AuthenticatedRequest } from "../controllers/Account";
import Account from "../models/account"
import item from "../models/item";
import CoinflipModel from "../models/coinflip";
import { commitToFutureBlock } from "../modules/trust";
import Item from "../models/item";
import AuthenticateToken from "../controllers/Authenticate";

const router = express.Router();

/* GET users list. */
router.get('/', function (_req: Request, res: Response) {
    res.jsonp({
        success: true,
        message: "Coinflip API Endpoint"
    })
});

router.get("/:id", async (req: Request, res: Response) => {
    const data = await CoinflipModel.findOne({ _id: req.params.id })

    return res.json({
        success: true,
        data: data
    })
})

router.post("/join", AuthenticateToken, async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).send(errors.array())
    }

    const user = (req as any).user

    const joiningUser: any = await Account.findOne({ _id: user.id })
    const joiningCoinflip: any = await CoinflipModel.findOne({ _id: req.body.id })

    if (joiningCoinflip == null) {
        return res.status(404).send('Coinflip Doesn\'t Exist')
    }

    if (joiningUser.balance < joiningCoinflip.value) {
        return res.status(400).send('Insufficient Balance')
    }

    if (joiningCoinflip.winnerCoin != null) {
        return res.status(403).send('Coinflip Has Finished')
    }

    if (joiningCoinflip.playerOne.username == joiningUser.username) {
        return res.status(400).send('You can\'t join yourself!')
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction()
        const blockInfo = await commitToFutureBlock();
        const clientSeed = blockInfo.head_block_id.toString();

        const concatenatedSeed = clientSeed + joiningCoinflip.serverSeed;
        const hash = crypto.createHash('sha256').update(concatenatedSeed).digest('hex');
        const result = parseInt(hash.slice(0, 1), 16) % 2 === 0 ? 'bux' : 'tix';

        const queriedLimiteds = await Item.find({ value: { $lte: joiningCoinflip.value * 500 } }).sort({ value: -1 }).limit(5)
        const randomNumber = Math.floor(Math.random() * 5)

        await Account.updateOne({ _id: user.id }, { balance: joiningUser.balance - joiningCoinflip.value })
        await CoinflipModel.updateOne({ _id: req.body.id }, {
            playerTwo: {
                username: joiningUser.username,
                avatarId: joiningUser.avatarId,
                limited: queriedLimiteds[randomNumber]
            },
            clientSeed: clientSeed,
            EOSBlock: blockInfo.head_block_num,
            serverSeed: joiningCoinflip.serverSeed,
            winnerCoin: result,
            endedAt: new Date().getTime()
        })

        if (result == joiningCoinflip.ownerCoin) {
            await Account.updateOne({ username: joiningCoinflip.playerOne.username }, {
                $inc: { balance: joiningCoinflip.value * 1.85 }
            })
        } else {
            await Account.updateOne({ username: joiningUser.username }, {
                $inc: { balance: joiningCoinflip.value * 1.8 }
            })
        }

        await session.commitTransaction()
        res.sendStatus(200)
    } catch (error) {
        await session.abortTransaction()
        console.error('Error:', error);
        res.sendStatus(500)
    }
})

router.post('/create', AuthenticateToken,
    body("value")
        .trim()
        .isNumeric()
        .withMessage('Bet amount must be a number')
        .isFloat({ min: 1 })
        .withMessage('Bet amount must be worth $1 or more')
        .escape(),
    body("coin")
        .trim()
        .isAlpha()
        .withMessage('Coin must only contain letters')
        .isIn(['bux', 'tix'])
        .withMessage('Coin must be bux or tix')
        .escape(),
    async (req: Request | AuthenticatedRequest, res: Response, _next: NextFunction) => {
        const user = (req as any).user;
        const errors = validationResult(req)

        if (errors.isEmpty() == false) {
            return res.json({
                success: false,
                message: "Request body invalid, please make sure to fill all fields",
                data: errors.array()
            })
        }

        const playerInfo = await Account.findById(user.id)

        if (playerInfo == null) {
            return res.json({
                success: false,
                message: "No such player exists"
            })
        }

        if (playerInfo.balance < req.body.value) {
            return res.json({
                success: false,
                message: "Your bet amount exceeds your balance"
            })
        }

        const session = await mongoose.startSession();

        try {
            session.startTransaction()
            // const serverSeed = crypto.randomBytes(16).toString('hex');
            const serverSeed = crypto.randomBytes(32).toString('hex');
            const hashedServerSeed = crypto.createHash('sha256').update(serverSeed).digest('hex');
            const queriedLimiteds = await item.find({ value: { $lte: req.body.value * 500 } }).sort({ value: -1 }).limit(5)

            if (queriedLimiteds.length <= 0) {
                return res.json({
                    success: false,
                    message: "You do not have any Limited item to bet on",
                })
            }

            const randomNumber = Math.floor(Math.random() * queriedLimiteds.length)
            const newCoinflip = new CoinflipModel({
                ownerCoin: req.body.coin,
                playerOne: {
                    username: playerInfo.username,
                    avatarId: playerInfo.avatarId,
                    limited: queriedLimiteds[randomNumber]
                },
                playerTwo: null,
                value: Math.round(req.body.value * 100) / 100,
                winnerCoin: null,
                serverSeed: serverSeed,
                hashedServerSeed: hashedServerSeed,
                EOSBlock: null,
                clientSeed: null,
                createdAt: new Date(),
                endedAt: null,
            })

            await newCoinflip.save()
            await Account.findByIdAndUpdate(user.id, { balance: playerInfo.balance - newCoinflip?.value }) // .value? Tf?
            await session.commitTransaction()
            const foundCF = await CoinflipModel.findOne({ serverSeed: serverSeed }, { serverSeed: 0 })
            console.log(foundCF)

            return res.json({
                success: true,
                data: foundCF
            })
        } catch (error) {
            await session.abortTransaction()
            console.error(error)
        }

        session.endSession()
        return res.json({
            success: false,
            message: "Something went wrong.",
        })
    })

const CoinflipRouter = router;
export default CoinflipRouter;