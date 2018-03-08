import { Error } from "mongoose";
import * as winston from "winston";
import { Promise } from "bluebird";
import { Config } from "../common/Config";
import { getValueInEth } from "../common/ValueConverter";
import {  TransactionType, TransactionAction } from "./Interfaces/INotification";

const PushNotifications = require("node-pushnotifications");
const config = require("config");

export class Notification {
    private push: any;
    private networkSymbol = config.get("NETWORK_SYMBOL") || "ETH";
    private settings = {
        apn: {
            token: {
                key: Buffer.from(config.get("PUSHER.APN.KEY"), "base64").toString(),
                keyId: config.get("PUSHER.APN.KEYID"),
                teamId: config.get("PUSHER.APN.TEAMID"),
            },
            production: true
        }
    }

    constructor() {
         this.push = new PushNotifications(this.settings);
    }

    process(transaction: any, device: any) {
        winston.info(`Processing device transaction block: ${transaction.blockNumber} id: ${transaction._id}, ${JSON.stringify(device)}`);

        const transactionType = this.getTransactionType(transaction);
        const addresses: string[] = transaction.addresses;
        const from: string = addresses[0];
        const token: string = device.token;

        return Promise.mapSeries(device.wallets, (wallet: string) => {
            const transactionAction = from === wallet ? TransactionAction.Sent : TransactionAction.Received;

            if (addresses.indexOf(wallet) !== -1) {
                if (transactionType === "transfer") {
                    const title = `${transactionAction} ${getValueInEth(transaction.value, 18)} ${this.networkSymbol} from`;
                    const ethMessage = this.createMeassage(title, from);

                    return this.send(token, ethMessage).then((notificationResult: any) => {
                        winston.info("Notification result :", JSON.stringify(notificationResult));
                    });
                }

                if (transactionType === "token_transfer") {
                    const operations = transaction.operations.filter((operation: any) => operation.to === wallet);
                    return Promise.map(operations, (operation: any) => {
                        const decimal: number = operation.contract.decimals;
                        const symbol: string = operation.contract.symbol;
                        const value: string = operation.value;

                        const title = `${transactionAction} ${getValueInEth(value, decimal)} ${symbol} from`;
                        const tokenMessage = this.createMeassage(title, from);

                        return this.send(token, tokenMessage).then((notificationResult: any) => {
                            winston.info("Notification result :", JSON.stringify(notificationResult));
                        });
                    })
                }
            }
        });
    };

    private createMeassage(title: string, from: string): {title: string, body: string, topic: string} {
        return {
            title,
            body: from,
            topic: config.get("PUSHER.APN.BUNDLE"),
        }
    }

    private getTransactionType(transaction: {operations: any[]}): string {
        const operations = transaction.operations;
        return operations.length >= 1 ? TransactionType.TokenTransfer : TransactionType.Transfer;
    }

    private send(token: string, data: any) {
        return this.push.send(token, data).then((results: any) => {
                return results;
            }).catch((error: Error) => {
                winston.info("Error sending notification: ", error);
            });
    }
}
