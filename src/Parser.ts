import * as express from "express";
import * as bodyParser from "body-parser";
import * as session from "express-session";
import * as dotenv from "dotenv";
import * as logger from "morgan";
import * as mongo from "connect-mongo";
import * as errorHandler from "errorhandler";
import { Database } from "./models/Database";
import * as fs from "fs";
import * as winston from "winston";
import { BlockchainParser } from "./common/BlockchainParser";
import { LegacyParser } from "./common/LegacyParser";
import { Config } from "./common/Config";
import { PusherScanner } from "./pusher/PusherScanner"

// Load environment variables from .env file, where API keys and passwords are configured.
dotenv.config();

const sessionSecret = "ashdfjhasdlkjfhalksdjhflak";
const MongoStore = mongo(session);
const parser = new BlockchainParser();
const pusher = new PusherScanner();

export class Parser {

    public app: any;
    public db: Database;

    constructor() {
        // create app
        this.app = express();

        // configure
        this.configureMiddleware();

        // setup database
        this.setupDatabase();

        // eventually start
        this.launch();
    }

    private configureMiddleware() {
        this.app.use(logger("dev"));
        this.app.use(logger("common", {stream: fs.createWriteStream("./access.log", {flags: "a"})}));

        this.app.use(session({
            resave: true,
            saveUninitialized: true,
            secret: sessionSecret,
            store: new MongoStore({
                url: process.env.MONGODB_URI,
                autoReconnect: true
            })
        }));

        // configure winston logger
        winston.add(
            winston.transports.File, {
                filename: "trustwallet-worker.log",
                level: "info",
                json: true,
                eol: "\r\n",
                timestamp: true
            }
        );
    }

    private setupDatabase() {
        this.db = new Database(process.env.MONGODB_URI);
        this.db.connect();
    }

    private launch() {
        parser.start();
        pusher.start();
    }
}

new Parser();
