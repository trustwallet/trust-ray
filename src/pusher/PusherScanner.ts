import { Error } from "mongoose";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Transaction } from "../models/TransactionModel";
import { TransactionParser } from "../common/TransactionParser";
import { Device } from "../models/DeviceModel";
import * as winston from "winston";
import { Config } from "../common/Config";
import * as utils from "../common/Utils"
import { Notification } from "./Notification";
import { Promise, reject } from "bluebird";

export class PusherScanner {
    private onErrordelay: number = 5000;
    private onRestartDelay: number = 150;
    private notification = new Notification();

    public start() {
        this.getNextPusherBlock().then((block: number) => {
            winston.info("Pusher processing block ", block);

            return TransactionParser.getTransactions(block).then((transactions: any[]) => {
                winston.info(`Found ${transactions.length} transactions in block ${block}`);

                 return Promise.mapSeries(transactions, (transaction) => {
                    return this.findDevicesByAddresses(transaction.addresses).then((devices: any[]) => {
                        if (devices.length > 0) {
                            return Promise.mapSeries(devices, (device: any) => {
                                return this.notification.process(transaction, device);
                            });
                        }
                    }).catch((error: Error) => {
                        winston.error("Error findDevicesByAddresses :", error);
                    });
                })
            }).catch((error: Error) => {
                winston.error("Error getBlockTransactions ", error);
            })
        }).then(() => {
            return LastParsedBlock.findOne().then((lastParsed: any) => {
                if (!lastParsed.lastPusherBlock) {
                    lastParsed.lastPusherBlock = lastParsed.lastBlock;
                    return lastParsed.save();
                }
                return LastParsedBlock.findOneAndUpdate({}, {$inc: {lastPusherBlock: 1}}, {upsert: true, new: true})
            })
        }).then(() => {
            utils.setDelay(this.onRestartDelay).then(() => {
                this.start();
            });
        }).catch((error: Error) => {
            winston.error("Error getPusherLatestBlock ", JSON.stringify(error));
            utils.setDelay(this.onErrordelay).then(() => {
            winston.info(`Pusher will retry in ${this.onErrordelay}`);
                this.start();
            });
        });
    }

    private findDevicesByAddresses(addresses: string[]) {
        return Device.find({wallets: {$in: addresses}});
    }

    private getNextPusherBlock(): Promise<any> {
        return LastParsedBlock.findOne({}).then((lastParsedBlock: any) => {
            return new Promise((resolve, reject) => {
                const lastPusherBlock = lastParsedBlock.lastPusherBlock;
                const lastBlock = lastParsedBlock.lastBlock;

                if (!lastBlock) return reject(`No lastBlock found in DB`);
                // TODO - correct promise rejection
                // if (!lastBlock) return reject(new Error(`No lastBlock found in DB`));

                if (!lastPusherBlock && lastBlock) return resolve(lastBlock);

                if (lastPusherBlock >= lastBlock) {
                    return reject(`lastPusherBlock ${lastPusherBlock - lastBlock} ahead of lastBlock, waiting for new block in DB`);
                    // TODO - correct promise rejection
                    // return reject(new Error(`lastPusherBlock ${lastPusherBlock - lastBlock} ahead of lastBlock, waiting for new block in DB`));
                }

                if (lastPusherBlock < lastBlock) return resolve(lastPusherBlock + 1);

                return resolve(lastBlock);
            });
        });
    }
}
