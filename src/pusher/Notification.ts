const PushNotifications = require("node-pushnotifications");
import { Error } from "mongoose";
import * as winston from "winston";
import { Promise } from "bluebird";
import { Config } from "../common/Config";

export class Notification {
	private push: any;

	private settings = {
		apn: {
			token: {
				key: Buffer.from(process.env.APN_KEY, "base64").toString(),
				keyId: process.env.APN_KEYID,
				teamId: process.env.APN_TEAMID,
			},
			production: true
		}
	}

	constructor() {
		 this.push = new PushNotifications(this.settings);
	}

	process(transaction: any, device: any) {
		const transactionType = this.getTransactionType(transaction);

		const addresses: string[] = transaction.addresses;
		const from: string = addresses[0];
		const to: string = addresses[1];
		const wallets: string[] = device.wallets;
		const token: string = device.token;

		return Promise.mapSeries(wallets, (wallet: string) => {
			if (addresses.indexOf(wallet) >= 0) {
				if (transactionType === "ETH") {
					const ethMessage = this.createEthMeassage(transaction);

					return this.send(token, ethMessage).then((notificationResult: any) => {
						winston.info("Notification result :", notificationResult);
					});
				}

				if (transactionType === "TOKEN") {
					const tokenMessage = this.createTokenMeassage(transaction);

					return this.send(token, tokenMessage).then((notificationResult: any) => {
						winston.info("Notification result :", notificationResult);
					});
				}
			}
		});	
	};

	private createEthMeassage(transaction: any) {
		const value = `${Config.web3.utils.fromWei(transaction.value)}`;

		return {
			title: `You received ${value} ETH from`,
			body: `${transaction.addresses[0]}`,
			topic: process.env.APN_BUNDLEID,
		}
	}

	private createTokenMeassage(transaction: any) {
		const operations = transaction.operations[0];
		return {
			title: `You received ${Config.web3.utils.fromWei(operations.value)} ${operations.contract.symbol} from`, 
			body: `${transaction.addresses[0]}`,
			topic: process.env.APN_BUNDLEID,
		}
	}

	private getTransactionType(transaction: any) {
		return transaction.operations.length >= 1 ? "TOKEN" : "ETH"
	}

	private send(token: string, data: any) {
		return this.push.send(token, data).then((results: any) => {
					winston.info("Push result :", results);
					return results;
				})
				.catch((error: Error) => {
					winston.info("Error sending notification: ", error);
				});
	}
	
}
