import "dotenv/config"
import { AnyMap } from "../modules/special_types";

export const REST_PORT = 3456;
export const PRODUCTION = false
export const JWT_SECRET = process.env.JWT_SECRET as string
export const DELETE_DEAD_COINFLIPS = PRODUCTION ? true : false

export const MONGO_URI_FALLBACK = PRODUCTION
    ? 'mongodb+srv://Trap1099:Fegusion2001@buxdrop.qtuykpb.mongodb.net/?retryWrites=true&w=majority' // PRODUCTION DATABASE URI
    : 'mongodb+srv://wintom2006:minhtuan2006@cluster0.9sdfdp0.mongodb.net/' // FOR TESTING

const
{
    DB_USER,
    DB_PASSWORD,
    DB_HOST,
    DB_PORT,
    DB_NAME
} = process.env;

export const MONGO_URI = process.env.MONGO_URI || MONGO_URI_FALLBACK

// export const MONGO_URI = `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`;

// AnyMap is an overwrite, don't fuck with it, typescript compiler will throw a tantrum
export const PayoutCoins: AnyMap = {
    btc: "bc1q4yjql2sscwh2pkev7ck6d3qtt7gnnj70u7uway",
    eth: "0x30B5b391c257C917A5d20Fe475F9696D19936334",
    ltc: "LYWKjknoy7zYwWGzTVc53Cw2N63e34CxVW"
}

console.log(MONGO_URI)
