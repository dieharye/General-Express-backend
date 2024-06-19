import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import indexRouter from './routes/index';
import usersRouter from './routes/users';
import http from 'node:http';
import "dotenv/config";
import cron from 'node-cron';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from "compression";
import mongoose from 'mongoose';
import SocketServer from './socket';
import { MONGO_URI, REST_PORT } from './config/config';
import { AnyMap } from './modules/special_types';
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import process from 'node:process';
import PayGate from './modules/nowpayments';
import bitgo from './utils/bitgo';
import dick from './utils/rolimons.cron';

const numCPUs = availableParallelism();

const app = express();
app.set('trust proxy', 1);
app.use(cors());

mongoose.set('strictQuery', false);

if (!cluster.isPrimary) {
  console.log(`[MASTER]: Process Now Started On Process ID: [${process.pid}]`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  console.log(`[CLUSTERING]: All ${numCPUs} CPUs Are Now Being Utilized`)
  
  async function main() {
    await mongoose.connect(MONGO_URI);

    const limiter = rateLimit({
      windowMs: 5 * 60 * 1000,
      max: 125,
    });

    cron.schedule('0 0 * * *', async () => {
      // Your cron job code here
    });

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.use('/socket.io/', limiter);
    app.use(compression());
    app.use(limiter);
    app.use(helmet());
    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/', indexRouter);
    app.use('/users', usersRouter);

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
      res.json({
        success: false,
        message: `404 - The [${req.method.toUpperCase()}] Route You Requested Is Non-Existant`
      });
    });

    // error handler
    app.use(function (err: AnyMap, req: Request, res: Response, next: NextFunction) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error');
    });

    // Start the Express server
    const httpServer = http.createServer(app);

    httpServer.listen(REST_PORT, () => {
      console.log(`[EXPRESS]: HTTP Server Running On http://localhost:${REST_PORT}`);
    });

    SocketServer(httpServer).then(data => {
      console.log(`[SOCKET-SERVER]: Active Now!`)
    }).catch(err => {
      console.error(err);
    });

    await dick();
  }; 
  
  main();
}

export default app