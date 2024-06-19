import { NextFunction, Request, Response } from "express";
import express from 'express';

const router = express.Router();

/* GET users listing. */
router.get('/', function (req: Request, res: Response, next: NextFunction) {
  res.jsonp({
    success: true,
    message: "Users API Endpoint"
  })
});

export default router