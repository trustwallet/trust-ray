import * as mongoose from "mongoose";
import * as winston from "winston";
import Bluebird = require("bluebird");
(<any>mongoose).Promise = Bluebird;

export class Database {

    private dbURI: string;

    constructor(dbURI: string) {
        this.dbURI = dbURI;
    }

    public connect() {
        const options: any = {
            autoIndex: true,
            poolSize: 500,
            useMongoClient: true,
            server: {
               // sets how many times to try reconnecting
               reconnectTries: Number.MAX_VALUE,
               // sets the delay between every retry (milliseconds)
               reconnectInterval: 1000
            }
        };

        mongoose.connect(this.dbURI, options)
        .then(() => {
            this.hookIntoConnectionMonitorEvents();
            this.setupShutdownHandlers();
        })
        .catch((err: Error) => {
           winston.error(`Could not connect to Mongo with error: ${err}`);
        });
    }

    private hookIntoConnectionMonitorEvents() {
        mongoose.connection.on("connected", () => {
            winston.info("Mongoose connected");
        });
        mongoose.connection.on("error", (err: any) => {
            winston.info(`Mongoose connection error: ${err}`);
        });
        mongoose.connection.on("disconnected", () => {
            winston.info("Mongoose disconnected");
        });
    }

    private setupShutdownHandlers() {
        // SIGUSR2 signal for nodemon shutdown
        process.once("SIGUSR2", () => {
            mongoose.connection.close(() => {
                winston.info("Mongoose disconnected through nodemon restart");
                process.kill(process.pid, "SIGUSR2");
            });
        });
        // SIGINT signal for regular app shutdown
        process.on("SIGINT", () => {
            mongoose.connection.close(() => {
                winston.info("Mongoose disconnected through app termination");
                process.exit(0);
            });
        });
        // SIGTERM signal for Heroku shutdown
        process.on("SIGTERM", () => {
            mongoose.connection.close(() => {
                winston.info("Mongoose disconnected through Heroku app shutdown");
                process.exit(0);
            });
        });
    }

}

