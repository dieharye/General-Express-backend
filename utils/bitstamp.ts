import { WithdrawCurrencies } from "../models/withdraws";
import { AnyMap } from "../modules/special_types";
import "dotenv/config"

const sdk = require('api')('@bitpay/v1.0#2obct1kls2mn9fd');

export async function BitpayPayout(
    amount: Number,
    currency: WithdrawCurrencies,
) {
    return new Promise((res, rej) => {
        sdk.createAPayout({
            skipInactive: false,
            amount: amount,
            currency: currency,
            ledgerCurrency: 'USD',
            token: process.env.BITPAY_TOKEN
        }, { 'x-accept-version': '2.0.0' })
            .then(({ data }: AnyMap) => {
                console.log(data)
                res(data)
            })
            .catch((err: Error | null) => {
                console.error(err)
                rej(err)
            });
    })
}

const API_KEY = process.env.BITSTAMP_API_KEY;

export async function BitstampWithdraw(
    amount: number,
    currency: WithdrawCurrencies,
    address: string,
    destination_tag: string,
    contact_thirdparty?: boolean,
    contact_uuid?: string,
    memo_id?: string,
    network?: string,
    vasp_uuid?: string
) {
    const API_URL = `https://www.bitstamp.net/api/v2/${currency.toLowerCase()}_withdrawal/`;

    const requestBody = new URLSearchParams();
    requestBody.append('amount', amount.toString());
    requestBody.append('currency', currency);
    requestBody.append('address', address);
    requestBody.append('destination_tag', destination_tag || "");

    if (contact_thirdparty) {
        requestBody.append('contact_thirdparty', contact_thirdparty.toString());
    }

    if (contact_thirdparty && contact_uuid) {
        requestBody.append('contact_uuid', contact_uuid);
    }

    if (memo_id) {
        requestBody.append('memo_id', memo_id);
    }

    if (network) {
        requestBody.append('network', network);
    }

    if (vasp_uuid) {
        requestBody.append('vasp_uuid', vasp_uuid);
    }

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: requestBody
    };

    try {
        const response = await fetch(API_URL, requestOptions);
        const responseData = await response.json();

        console.log(responseData);
        return responseData;
    } catch (error) {
        console.error(error);
        throw error;
    }
}
