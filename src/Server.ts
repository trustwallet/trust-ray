
import * as express from "express";
import * as bodyParser from "body-parser";
import * as session from "express-session";
import * as dotenv from "dotenv";
import * as logger from "morgan";
import * as mongo from "connect-mongo";
import * as errorHandler from "errorhandler";
import { Database } from "./models/Database";
import { router } from "./routes/ApiRoutes";
import expressValidator = require("express-validator");
import * as fs from "fs";
import * as winston from "winston";
import { BlockchainParser } from "./common/BlockchainParser";
import { LegacyParser } from "./common/LegacyParser";
import { Config } from "./common/Config";

// Load environment variables from .env file, where API keys and passwords are configured.
dotenv.config();

const port = process.env.PORT || 8000;
const sessionSecret = "ashdfjhasdlkjfhalksdjhflak";
const MongoStore = mongo(session);
const parser = new BlockchainParser();

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
            secret: sessionSecret,
            store: new MongoStore({
                url: process.env.MONGODB_URI,
                autoReconnect: true
            })
        }));

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
        this.db = new Database(process.env.MONGODB_URI);
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

        parser.start();
    }
}

new Server();
