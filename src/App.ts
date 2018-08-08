
import * as express from "express";
import * as bodyParser from "body-parser";
import * as logger from "morgan";
import * as errorHandler from "errorhandler";
import { Database } from "./models/Database";
import { router } from "./routes/ApiRoutes";
import expressValidator = require("express-validator");
import * as winston from "winston";

const config = require("config");
const cors = require("cors");
const compression = require("compression")
const port = process.env.PORT || 8000;

export class App {

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
        this.app.use(compression())
        this.app.use(cors());
        this.app.set("port", port);
        this.app.use(logger("dev"));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(expressValidator());

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
        this.db = new Database(config.get("MONGO.URI"));
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
    }
}
