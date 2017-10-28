
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
import { EthereumBlockchainUtils } from "./common/blockchain.utils";
const cron = require("node-cron");

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env.example" });

const port = process.env.PORT || 8005;
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
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(expressValidator());
        this.app.use(session({
            resave: true,
            saveUninitialized: true,
            secret: process.env.SESSION_SECRET,
            store: new MongoStore({
                url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
                autoReconnect: true
            })
        }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        // remove for production
        this.app.use(errorHandler());
    }

    private setupDatabase() {
        this.db = new Database(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
        this.db.connect();
    }

    private addRoutes() {
        this.app.use("/api", router);
    }

    private launch() {
        this.app.listen(this.app.get("port"), () => {
            console.log(("App is running at http://localhost:%d in %s mode"), this.app.get("port"), this.app.get("env"));
            console.log("Press CTRL-C to stop\n");
        });

        // setup cron job for refreshing transactions fro blockchain
        cron.schedule("*/15 * * * * *", () => {
            EthereumBlockchainUtils.retrieveNewTransactionsFromBlockchain();
        });
    }
}


new Server();