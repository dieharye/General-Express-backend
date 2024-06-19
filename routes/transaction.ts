// @ts-nocheck


import { NextFunction, Request, Response } from "express";
import express from 'express';
import PayGate from "../modules/nowpayments";
import transactions from "../models/transactions";

import { callbackCheckPostCoinpaymentsData,
    callbackCheckPostCoinpaymentsHmac,
    callbackCheckPostCoinpaymentsTransaction,
    callbackCheckPostSkinifyData,
    callbackCheckPostSkinifyToken,
    callbackCheckPostSkinifyTransaction,
    callbackCheckPostZebrasmarketData,
    callbackCheckPostZebrasmarketSignature,
    callbackCheckPostZebrasmarketTransaction,
    callbackCoinpaymentsCreateHmac,
    callbackZebrasmarketCreateSignature
} from "../utils/callback";

import account from "../models/account";
import CryptoAddress from "../models/CryptoAddress";

const router = express.Router();

/* GET users listing. */
router.get('/', function (req: Request, res: Response, next: NextFunction) {
    res.jsonp({
        success: true,
        message: "Transaction API Endpoint"
    })
});

router.post('/verify/:txid', async function (req: Request, res: Response) {
    const { txid } = req.params;
    console.log(txid)
    const trans = await transactions.findOne({ txid: txid })
    if (trans?.np_trans.payment_id == null) {
        res.json({
            success: false,
            message: "Transaction invalid, please create a new one"
        })
    }

    if (trans == null || trans?.np_trans == null) {
        res.jsonp({
            success: false,
            message: "Transaction record does not exist."
        })
    }

    console.log(trans)

    const payment_id = parseInt(trans?.np_trans.payment_id)
    console.log(payment_id)
    const status = await PayGate.getPaymentStatus(payment_id);
    console.log(status)

    res.jsonp({
        success: true,
        data: status
    })
});

let callbackBlockTransactionCrypto = [];

router.post('/coinpayments', async(req, res) => {
    try {
        // Validate sent data
        callbackCheckPostCoinpaymentsData(req.headers, req.body);

        // Create sha512 hmac for sent body
        const hmac = callbackCoinpaymentsCreateHmac(req.body);

        // Validate sent hmac
        callbackCheckPostCoinpaymentsHmac(hmac, req.headers);

        // Get transaction id and currency
        const transactionId = req.body.ipn_type === 'deposit' ? req.body.deposit_id : req.body.id;
        const currency = req.body.currency === 'USDT.ERC20' ? 'usdt' : req.body.currency.toLowerCase();

        // Validate crypto transaction
        callbackCheckPostCoinpaymentsTransaction(transactionId, callbackBlockTransactionCrypto);

        try {
            // Add transactions id to crypto block array
            callbackBlockTransactionCrypto.push(transactionId.toString());

            // Get crypto address and crypto transaction from database
            let dataDatabase = await Promise.all([
                CryptoAddress.findOne({ name: currency, address: req.body.address }).select('address user txid').lean()
            ]);

            if(req.body.ipn_type === 'deposit' && dataDatabase[0] !== null && req.body.status >= 100) {
                // Create promises array
                let promises = [];

                // Get transaction amount in fiat
                const amountFiat = req.body.fiat_amount;

                // Get transaction amount in robux
                const amount = amountFiat; // 15%bonus

                // Add update user and create crypto transaction queries to promises array
                promises = [
                    account.findByIdAndUpdate(dataDatabase[0].user, {
                        $inc: {
                            balance: amount
                        },
                        updatedAt: new Date().getTime()
                    }, { new: true }),

                    transactions.updateOne({
                        txid: dataDatabase[0].txid
                    }, {
                        $set: {
                            confirmed: true,
                        }
                    })
                ];
                console.log(dataDatabase[0]);

                // Execute promises array queries
                dataDatabase = await Promise.all(promises);

            }

            // Remove transaction id from crypto block array
            callbackBlockTransactionCrypto.splice(callbackBlockTransactionCrypto.indexOf(transactionId.toString()), 1);

            res.status(200).json({ success: true });
        } catch(err) {
            console.log(err);
            callbackBlockTransactionCrypto.splice(callbackBlockTransactionCrypto.indexOf(transactionId.toString()) , 1);
            res.status(500).json({ success: false, error: { type: 'error', message: err.message } });
        }
    } catch(err) {
        console.log(err);
        res.status(500).json({ success: false, error: { type: 'error', message: err.message } });
    }
});

export default router