// @ts-nocheck


import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import express from 'express';
const router = express.Router();
import bcrypt from "bcryptjs"
import PayGate, { CallbackPayment, CryptoCurrency } from '../modules/nowpayments';
import transactions from '../models/transactions';
import { createHash } from "crypto";
import Account from "../models/account"
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import CoinflipRouter from "./coinflip";
import { AuthenticatedRequest } from "../controllers/Account";
import AuthenticateToken from "../controllers/Authenticate";
import Roblox, { HeadshotFormat, HeadshotSize } from "../modules/roblox";
import { JWT_SECRET } from "../config/config";
import TransactionRouter from "./transaction"
import { AnyMap } from "../modules/special_types";
import account from "../models/account";
import crypto from "crypto"
import { sortObject } from "../utils/hmac";
import withdraws from "../models/withdraws";
import callback_store from "../models/callback_store";

import CryptoAddress from "../models/CryptoAddress";
import { cashierCryptoGenerateAddress } from "../utils/cashier/crypto";

export const CURRENCIES = ["btc", "eth", "ltc"];
export const IPNKEY = process.env.IPN_KEY as string

/* GET home page. */
router.get("/", function (req: Request, res: Response) {
    res.json({
        success: true,
        message: "Status OK - Welcome To API v0.0.1"
    })
})

router.post('/signup',
    body('email')
        .trim()
        .isEmail()
        .withMessage('The email you provided is not in the correct format')
        .isLength({ max: 35 })
        .withMessage('Your email must not exceed 35 characters')
        .escape(),
    body('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Your username must be 3 or more characters long')
        .isLength({ max: 15 })
        .withMessage('Your usermame must not exceed 15 characters')
        .escape(),
    body('password')
        .trim()
        .isLength({ min: 6 })
        .withMessage('Your password must be 6 or more characters long')
        .isLength({ max: 35 })
        .withMessage('Your password must not exceed 35 characters')
        .escape(),
    async (req, res, next) => {
        const errors = validationResult(req)
        const usernameExists = await Account.find({ username: req.body.username })
        const emailExists = await Account.find({ email: req.body.email })

        if (usernameExists.length > 0) {
            return res.json({
                success: false,
                message: 'Username already exists',
            })
        } else if (emailExists.length > 0) {
            return res.json({
                success: false,
                message: "An account with this email already exists"
            })
        }

        if (!errors.isEmpty()) {
            console.log(errors.array())
            res.status(400).json({
                success: false,
                errors: errors.array()
            })
            return
        }

        bcrypt.hash(req.body.password, 10, async (err: Error | null, hashedPassword: string) => {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                })
            }

            const hashedEmail = createHash('sha256').update(req.body.email).digest('hex')
            if (err) {
                return res.json({
                    success: false,
                    message: err
                })
            }

            const headshot = await Roblox.GetHeadshot(1877006416, HeadshotSize.SMALLEST, HeadshotFormat.PNG, false)
            const account = new Account({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword,
                headshot: headshot,
                avatarId: hashedEmail,
                role: 'Member'
            })

            await account.save()

            const user: any = await Account.findOne({ username: req.body.username });
            const token = jwt.sign({ id: user._id }, JWT_SECRET)
            res.json({
                success: true,
                message: "Successfully logged in",
                data: token
            })

            try{
                // Generate new crypto addresses with coinpayments api
                const addresses = await Promise.all([
                    cashierCryptoGenerateAddress('btc'),
                    cashierCryptoGenerateAddress('eth'),
                    cashierCryptoGenerateAddress('ltc'),
                    cashierCryptoGenerateAddress('usdt.erc20'),
                    cashierCryptoGenerateAddress('usdc')
                ]);

                // Save users crypto deposit addresses in database
                await Promise.all([
                    CryptoAddress.create({ name: 'btc', address: addresses[0].address, user: user._id }),
                    CryptoAddress.create({ name: 'eth', address: addresses[1].address, user: user._id }),
                    CryptoAddress.create({ name: 'ltc', address: addresses[2].address, user: user._id }),
                    CryptoAddress.create({ name: 'usdt', address: addresses[3].address, user: user._id }),
                    CryptoAddress.create({ name: 'usdc', address: addresses[4].address, user: user._id }) 
                ]);
            }catch(err){
                console.log(err);
            }
        })
    })

router.post('/login', async (req: Request, res: Response) => {
    const user = await Account.findOne({ email: req.body.email });
    if (!user) {
        return res.status(400).json({
            success: false,
            message: "No account found, please try signing up."
        })
    };

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
        return res.status(400).json({
            success: false,
            message: "The password you entered is not correct"
        })
    };

    const token = jwt.sign({ id: user._id }, JWT_SECRET as string)
    res.json({
        success: true,
        data: token
    })
})

router.get('/auto-login', AuthenticateToken, async (req: AuthenticatedRequest | Request, res: Response) => {
    const user = (req as any).user;
    const userData = await Account.findOne({ _id: user.id })

    res.json(
        {
            data: userData,
            success: true,
        }
    )
})

router.get('/coinflip', CoinflipRouter)

router.get('/get-transaction/:id', async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.params)
    const trans = await transactions.findOne({ txid: req.params.id })
    console.log(trans)

    if (trans != null) {
        return res.json({
            success: true,
            data: trans
        })
    } else {
        return res.json({
            success: false,
            message: "Transaction not found"
        })
    }
})

router.get("/deposit/minimum/:currency", async (req, res) => {
    const currency = req.params.currency as CryptoCurrency

    if (CURRENCIES.includes(currency)) {
        const mini: any = await PayGate.getMinimum(currency) // Takes 1-3 seconds
        return res.json({
            success: false,
            data: mini
        })
    } else {
        return res.json({
            success: false,
            message: "Invalid currency"
        })
    }
})

router.post('/create-transaction', AuthenticateToken, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user
        let currency = (req.body?.currency)
    
        if (currency != null) {
            currency = currency.toLowerCase()
        } else {
            return res.json({
                success: false,
                message: "Please choose one of the valid currencies"
            })
        }
    
        if (CURRENCIES.includes(currency) != true) {
            return res.json({
                success: false,
                message: "Please choose one of the valid currencies"
            })
        }
    
        const amount = req.body.amount
        if (amount <= 0) {
            return res.json({
                success: false,
                message: "Invalid amount"
            })
        }
    
        const Id = crypto.randomUUID();
        const np_trans = await PayGate.createPayment(100, Id, currency)
    
        console.log(np_trans)
    
        if (np_trans.payment_id == null || np_trans.status == false) {
            switch (np_trans.code) {
                case 'AMOUNT_MINIMAL_ERROR': {
                    const mini: any = await PayGate.getMinimum(currency) // Takes 1-3 seconds
                    return res.json({
                        success: false,
                        message: `Deposit amount too low, should be atleast ${mini.fiat_equivalent.toFixed(2)}$`,
                    })
                }
                default: {
                    return res.json({
                        success: false,
                        message: "Paywall - Internal Server Error Occured"
                    })
                }
            }
        }
    
        const user_id = (await account.findOne({ _id: user.id }))?._id;
    
        const CryptoAddress_addy = await CryptoAddress.findOne({ user: user_id, name: np_trans.network });
    
        CryptoAddress_addy.txid = Id;
        await CryptoAddress_addy?.save();
    
        np_trans.pay_address = CryptoAddress_addy.address;
        np_trans.pay_amount = np_trans.pay_amount / 100 * amount
        np_trans.price_amount = amount;
    
        const trans = await transactions.create({
            txid: Id,
            amount: amount,
            owner_id: user.id,
            np_trans: {
                ...np_trans,
                ipn_callback_url: "a", // Remove ipn_callback_url so hackers can't find it
            }
        })
    
        console.log(trans)
    
        if (trans) {
            return res.json({
                success: true,
                message: "Success, transaction created.",
                data: {
                    txid: Id
                }
            })
        } else {
            return res.json({
                success: false,
                message: "Transaction failed"
            })
        }
    }catch(err){
        return res.json({
            success: false,
            message: "Transaction failed"
        })
    }
})

router.use('/transaction', TransactionRouter)
router.use('/coinflip', CoinflipRouter)

router.post('/withdraw', AuthenticateToken, body('amount')
    .trim()
    .isNumeric()
    .withMessage('Amount field must be a number and should not be empty')
    .escape(),
    body('currency')
        .trim()
        .isString()
        .withMessage('Must select a valid currency to withdraw')
        .escape(),
    body('address')
        .trim()
        .isString()
        .withMessage('Please enter a wallet address to withdraw')
        .escape(),
    async (req: Request, res: Response) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            })
        }

        const user_id: string = (req as any).user.id;
        const user: AnyMap | null = await account.findOne({ _id: user_id })
        const amount = req.body.amount;
        const address = req.body.address;
        const currency = req.body.currency;

        if (address == null || address.length < 10 || address == "") {
            return res.json({
                success: false,
                message: 'Please enter a valid address'
            })
        }

        if (amount < 3) {
            return res.json({
                success: false,
                message: 'Minimum withdraw amount is 3$'
            })
        }

        if (currency == null || !currency) {
            return res.json({
                success: false,
                message: 'Select a currency'
            })
        }

        console.log(req.body.amount)
        console.log(user)

        if (user == null) {
            return res.json({
                success: false,
                message: 'User not found in database'
            })
        }

        if (user?.balance < amount) {
            return res.json({
                success: false,
                message: `You don't have ${amount}$ to withdraw`
            })
        }


        if (user?.balance < amount) {
            return res.json({
                success: false,
                message: `You don't have ${amount}$ to withdraw`
            })
        }

        user.balance -= amount;
        await user.save();

        const record = await new withdraws({
            Amount: amount,
            OwnerId: user.username,
            UserId: user._id,
            Currency: currency,
            Address: address,
        }).save()

        return res.json({
            success: true,
            message: `Success`,
            data: record
        })

    })


const hmac = crypto.createHmac('sha512', IPNKEY); // IPNKEY = process.env.IPN_KEY
hmac.update(JSON.stringify(sortObject(body)));
const signature = hmac.digest('hex');

router.post('/transaction-callback', async (req: Request, res: Response) => {
    const body: CallbackPayment = req.body
    const np_sig: any = req.headers["x-nowpayments-sig"] // Nowpayments Signature
    const order_id = body.order_id // the transaction id basically

    if (np_sig == null || !np_sig) {
        return res.json({
            success: false,
            message: "Unauthorized - Intruder"
        })
    }

    console.log(`- Mathces: [${signature == np_sig}] \n   - NowPayments Signature: [${np_sig}] Match With: [${signature}]`)

    if (signature == np_sig) {
        const trans = await transactions.findOne({
            txid: order_id
        })

        if (trans?.confirmed) {
            return res.json({
                success: false,
                message: "Tranaction already completed"
            })
        }

        await new callback_store(
            {
                ...body,
                headers: {
                    np_sig,
                }
            }
        ).save()

        if (!trans || trans == null) {
            return res.json({
                success: false,
                message: "Tranaction not found"
            })
        }

        try {
            console.log(`Increasing User(${trans.owner_id}) Balance With ${trans.amount}`)
            await account.findByIdAndUpdate(trans.owner_id, {
                $inc: {
                    balance: trans.amount
                }
            })

            await transactions.updateOne({
                txid: trans.txid
            }, {
                $set: {
                    confirmed: true,
                }
            })

            return res.json({
                success: true,
                message: "Success, Transaction Complete",
            })
        } catch (err) {
            console.log(err)
            return res.json({
                success: false,
                message: "Something went wrong",
            })
        }
    } else {
        return res.json({
            success: false,
            message: "Invalid Signature"
        })
    }
})

router.get('/withdraws/latest', async (req: Request, res: Response) => {
    const latest = await withdraws.find({
        Completed: false,
    }).sort({ date: -1 }).limit(100)

    return res.json({
        success: true,
        data: latest
    })
})


router.post('/withdraws/complete/:id', AuthenticateToken, async (req: Request, res: Response) => {
    const id = req.params.id
    const user = await account.findOne({
        _id: (req as any).user.id
    })

    if (user == null) {
        return res.json({
            success: false,
            message: "Admin not found",
        })
    }

    if (user.isAdmin) {
        try {
            const update = await withdraws.updateOne({
                _id: id,
            }, {
                $set: {
                    Completed: true
                }
            })

            return res.json({
                success: true,
                message: "Success",
                data: update
            })
        } catch (err) {
            return res.json({
                success: true,
                message: "Unexpected Error occured - Make sure the record exists",
            })
        }
    } else {
        return res.json({
            success: false,
            message: "Unauthorized - Not Admin"
        })
    }
})


export default router