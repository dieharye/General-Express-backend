// @ts-nocheck


const validator = require('validator');
const fetch = require('node-fetch');
const crypto = require('crypto');



const cashierCryptoGetPrices = () => {
    return new Promise(async(resolve, reject) => {
        try {
            // Create body object
            const body = {
                cmd: 'rates',
                short: 1,
                accepted: 2,
                key: process.env.COINPAYMENTS_API_KEY,
                version: 1,
                format: 'json'
            };

            // Convert body object to string
            const bodyString = Object.entries(body).map(([key, value]) => `${key}=${value}`).join('&');

            // Create headers object
            let headers = {
                'content-type': 'application/x-www-form-urlencoded',
                'hmac': crypto.createHmac('sha512', process.env.COINPAYMENTS_PRIVATE_KEY).update(bodyString).digest('hex')
            };

            // Send get crypto deposit address
            let response = await fetch(`https://www.coinpayments.net/api.php`, {
                method: 'POST',
                headers: headers,
                body: new URLSearchParams(body)
            });

            // Check if the response is successful
            if(response.ok) {
                response = await response.json();
                resolve(response.result);
            } else {
                reject(new Error(response.statusText));
            }
        } catch(err) {
            reject(err);
        }
    });
}


const cashierCryptoGenerateAddress = (currency: any) => {
    return new Promise(async(resolve, reject) => {
        try {
            // Create body object
            const body = {
                cmd: 'get_callback_address',
                currency: currency,
                key: process.env.COINPAYMENTS_API_KEY,
                version: 1,
                format: 'json'
            };

            // Convert body object to string
            const bodyString = Object.entries(body).map(([key, value]) => `${key}=${value}`).join('&');

            // Create headers object
            let headers = {
                'content-type': 'application/x-www-form-urlencoded',
                'hmac': crypto.createHmac('sha512', process.env.COINPAYMENTS_PRIVATE_KEY).update(bodyString).digest('hex')
            };

            // Send get crypto deposit address
            let response = await fetch(`https://www.coinpayments.net/api.php`, {
                method: 'POST',
                headers: headers,
                body: new URLSearchParams(body)
            });

            // Check if the response is successful
            if(response.ok) {
                response = await response.json();
                resolve(response.result);
            } else {
                reject(new Error(response.statusText));
            }
        } catch(err) {
            reject(err);
        }
    });
}

export {
    cashierCryptoGetPrices,
    cashierCryptoGenerateAddress
}
