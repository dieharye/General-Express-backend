import Account from '../models/account'
import { Request } from "express"
import jwt from 'jsonwebtoken'
import "dotenv/config"

const JWT_SECRET = process.env.JWT_SECRET as string

export interface AuthenticatedRequest extends Request {
    user: any;
}

export const getUserData = async (jsonwebtoken: string) => {
    if (jsonwebtoken == null) return
    const token = jwt.verify(jsonwebtoken, JWT_SECRET)
    // const userData = await Account.findOne({ _id: (token as any).id }, { username: 1, avatarId: 1, role: 1, balance: 1, _id: 1 })
    const userData = await Account.findOne({ _id: (token as any).id })
    return userData
}
