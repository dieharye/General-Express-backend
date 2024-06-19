import { NextFunction, Request, Response } from "express"
import { JWT_SECRET } from "../config/config"
import jwt from "jsonwebtoken"

function AuthenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req?.headers?.authorization
    if (authHeader == null) {
        return res.json({
            success: false,
            message: 'Authentication token not found'
        })
    }

    console.log(authHeader)
    const token = authHeader.split(' ')[1] // Second Element
    console.log(token)
    // Example: {Bearer JSON-WEB-TOKEN}

    if (token == null) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Token Invalid"
        })
    }

    jwt.verify(token, JWT_SECRET, (err: Error | null, user: any) => {
        if (err) {
            return res.json({
                success: false,
                message: "Unauthorized - Not Allowed",
            })
        }

        (req as any).user = user
        next()
    })
}

export default AuthenticateToken
export { AuthenticateToken }