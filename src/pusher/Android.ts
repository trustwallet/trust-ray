import * as admin from "firebase-admin";
import * as Bluebird from "bluebird";
import * as winston from "winston";
const config = require("config");
import { getValueInEth } from "../common/ValueConverter";
import {  TransactionType, TransactionAction } from "./Interfaces/INotification";

export default class Firebase {
    private firebase

    constructor() {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config.get("PUSHER.FCM.PROJECT_ID"),
                clientEmail: config.get("PUSHER.FCM.CLIENT_EMAIL"),
                privateKey: config.get("PUSHER.FCM.PRIVATE_KEY"),
            }),
            databaseURL: config.get("PUSHER.FCM.DATABASE_URL")
        });
    }


    send(deviceToken, title, from) {
        const message = this.createMeassage(deviceToken, title, from)

        admin.messaging().send(message)
            .then((response: any) => {
                winston.info(`Successfully sent message ${response}`)
            })
            .catch((error: Error) => {
                winston.error(`Error sending message to firebase ${error}`)
            })
    }

    createMeassage(token, title, body) {
        return {
            notification: {
                title,
                body
            },
            token
        }
    }

}