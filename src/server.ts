
import * as express from "express";
import * as bodyParser from "body-parser";
import * as passport from "passport";
import * as session from "express-session";
import * as dotenv from "dotenv";
import * as logger from "morgan";
import * as mongo from "connect-mongo";
import * as errorHandler from "errorhandler";
import { Database } from "./models/db";
import { router } from "./routes/api";
import expressValidator = require("express-validator");
import * as fs from "fs";
import * as winston from "winston";
import { EthereumBlockchainUtils } from "./common/blockchain.utils";
const cron = require("node-cron");
import { LatestBlock } from "./models/latestBlock.model";

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env.example" });

const port = 8000;
const MongoStore = mongo(session);

export class Server {

    public app: any;
    public db: Database;


    constructor() {
        // create app
        this.app = express();

        // configure
        this.configureMiddleware();

        // setup database
        this.setupDatabase();

        // add routes
        this.addRoutes();

        // eventually start
        this.launch();
    }


    private configureMiddleware() {
        this.app.set("port", port);
        this.app.use(logger("dev"));
        this.app.use(logger("common", {stream: fs.createWriteStream("./access.log", {flags: "a"})}));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(expressValidator());
        this.app.use(session({
            resave: true,
            saveUninitialized: true,
            secret: "ashdfjhasdlkjfhalksdjhflak",
            store: new MongoStore({
                url: process.env.MONGODB_URI,
                autoReconnect: true
            })
        }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        // configure winston logger
        winston.add(
            winston.transports.File, {
                filename: "trustwallet.log",
                level: "info",
                json: true,
                eol: "\r\n",
                timestamp: true
            }
        );

        // remove for production
        this.app.use(errorHandler());
    }

    private setupDatabase() {
        this.db = new Database(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
        this.db.connect();
    }

    private addRoutes() {
        this.app.use("/", router);
    }

    private launch() {
        this.app.listen(this.app.get("port"), () => {
            winston.info(("App is running at http://localhost:%d in %s mode"), this.app.get("port"), this.app.get("env"));
            winston.info("Press CTRL-C to stop\n");
        });

        // check if a latest block is in DB, if yes, parse new blocks in the
        // blockchain, otherwise start a full parse of the entire blockchain

        LatestBlock.findOne({}).exec().then((latestBlockInDb: any) => {
            if (!latestBlockInDb) {
                EthereumBlockchainUtils.parseEntireBlockchain();
            } else {
                // setup cron job for refreshing transactions fro blockchain
                cron.schedule("*/15 * * * * *", () => {
                    EthereumBlockchainUtils.retrieveNewTransactionsFromBlockchain();
                });
            }
        }).catch((err: Error) => {
           winston.error("Error retrieving latest block from DB while starting server");
        });
    }
}


new Server();
