import { NextFunction, Request, Response } from "express";
import express from 'express';

const router = express.Router();

/* GET users listing. */
router.get('/nowpayments', function (req: Request, res: Response, next: NextFunction) {
    const body = req.body;
    console.log(body)

    res.jsonp({
        success: true,
        message: "Transaction API Endpoint"
    })
});

export default router