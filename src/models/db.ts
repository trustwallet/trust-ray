import * as mongoose from "mongoose";

require("../models/latestBlock.model");
require("../models/lastParsedBlock.model");
require("../models/device.model");
require("../models/transaction.model");
require("../models/token.model");

export class Database {

    private dbURI: string;

    constructor(dbURI: string) {
        this.dbURI = dbURI;
    }

    public connect() {
        mongoose.connect(this.dbURI);
        this.hookIntoConnectionMonitorEvents();
        this.setupShutdownHandlers();
    }

    private hookIntoConnectionMonitorEvents() {
        mongoose.connection.on("connected", () => {
            console.log("Mongoose connected");
        });
        mongoose.connection.on("error", (err: any) => {
            console.log(`Mongoose connection error: ${err}`);
        });
        mongoose.connection.on("disconnected", () => {
            console.log("Mongoose disconnected");
        });
    }

    private setupShutdownHandlers() {
        // SIGUSR2 signal for nodemon shutdown
        process.once("SIGUSR2", () => {
            mongoose.connection.close(() => {
                console.log("Mongoose disconnected through nodemon restart");
                process.kill(process.pid, "SIGUSR2");
            });
        });
        // SIGINT signal for regular app shutdown
        process.on("SIGINT", () => {
            mongoose.connection.close(() => {
                console.log("Mongoose disconnected through app termination");
                process.exit(0);
            });
        });
        // SIGTERM signal for Heroku shutdown
        process.on("SIGTERM", () => {
            mongoose.connection.close(() => {
                console.log("Mongoose disconnected through Heroku app shutdown");
                process.exit(0);
            });
        });
    }

}

