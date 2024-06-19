import { CryptoCurrency } from "../modules/nowpayments";
const BitGo = require("bitgo")

const BURL = "https://app.bitgo-test.com"
const bitgo = new BitGo.BitGo({ accessToken: process.env.BITGO_TOKEN });

class Bitgo {
    async CreateNewWallet(crypto: CryptoCurrency, walletId: string) {
        // return new Promise((resolve, reject) => {
        //     fetch(`${BURL}/api/v2/${crypto}/wallet/${walletId}/address`)
        //         .then(res => res.json())
        //         .then(data => {
        //             resolve(data)
        //         })
        //         .catch(err => {
        //             reject(err)
        //         })
        // })

        bitgo.createAddress({ label: `John's Deposit Address` }).then(function (address: string) {
            console.dir(address);
        });
    }

    async BitgoSession() {
        const result = await bitgo.session();

        return result;
    }
}

export default new Bitgo()