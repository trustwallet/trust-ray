import * as admin from "firebase-admin";
import * as winston from "winston";
const config = require("config");

export default class Firebase {

    constructor() {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config.get("PUSHER.FCM.PROJECT_ID"),
                clientEmail: config.get("PUSHER.FCM.CLIENT_EMAIL"),
                privateKey: config.get("PUSHER.FCM.PRIVATE_KEY").replace(/\\n/g, "\n"),
            }),
            databaseURL: config.get("PUSHER.FCM.DATABASE_URL")
        });
    }


    send(deviceToken, title, from) {
        const message = this.createMeassage(title, from)
        const options: admin.messaging.MessagingOptions = {
            priority: "high",
        }

        admin.messaging().sendToDevice(deviceToken, message, options)
            .then((response: any) => {
                winston.info(`FCM successfully sent message to device ${deviceToken} from`, response)
            })
            .catch((error: Error) => {
                winston.error(`FCM failed to send message`, error)
            })
    }

    private createMeassage(title, body): admin.messaging.MessagingPayload  {
        return {
            notification: {
                title,
                body
            },
        }
    }
}