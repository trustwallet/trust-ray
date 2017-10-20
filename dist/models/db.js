"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
class Database {
    constructor(dbURI) {
        this.dbURI = dbURI;
    }
    connect() {
        mongoose.connect(this.dbURI);
        this.hookIntoConnectionMonitorEvents();
        this.setupShutdownHandlers();
    }
    hookIntoConnectionMonitorEvents() {
        mongoose.connection.on("connected", function () {
            console.log("Mongoose connected");
        });
        mongoose.connection.on("error", function (err) {
            console.log("Mongoose connection error: " + err);
        });
        mongoose.connection.on("disconnected", function () {
            console.log("Mongoose disconnected");
        });
    }
    setupShutdownHandlers() {
        // SIGUSR2 signal for nodemon shutdown
        process.once("SIGUSR2", function () {
            mongoose.connection.close(function () {
                console.log("Mongoose disconnected through nodemon restart");
                process.kill(process.pid, "SIGUSR2");
            });
        });
        // SIGINT signal for regular app shutdown
        process.on("SIGINT", function () {
            mongoose.connection.close(function () {
                console.log("Mongoose disconnected through app termination");
                process.exit(0);
            });
        });
        // SIGTERM signal for Heroku shutdown
        process.on("SIGTERM", function () {
            mongoose.connection.close(function () {
                console.log("Mongoose disconnected through Heroku app shutdown");
                process.exit(0);
            });
        });
    }
}
exports.Database = Database;
//# sourceMappingURL=db.js.map