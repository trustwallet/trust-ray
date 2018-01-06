import { Error } from "mongoose";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Transaction } from "../models/TransactionModel";
import { Device } from "../models/DeviceModel";
import * as winston from "winston";
import { Config } from "../common/Config";
import * as utils from "../common/Utils"
import { Notification } from "./Notification";
import { Promise, reject } from "bluebird";

export class PusherScanner {
    private delay: number = 5000;

    public start() {
        this.getNextPusherBlock().then((block: number) => {
            winston.info("Pusher processing block ", block);

            return this.getBlockTransactions(block).then((transactions: any[]) => {
                winston.info(`Found ${transactions.length} in block ${block}`);

                 return Promise.mapSeries(transactions, (transaction) => {

                    this.findDevicesByAddresses(transaction.addresses).then((devices: any[]) => {
                        if (devices.length > 0) {

                            Promise.mapSeries(devices, (device: any) => {
                                const notification = new Notification();
                                notification.process(transaction, device);
                            });
                        }
                    }).catch((error: Error) => {
                        winston.error("Error findDevicesByAddresses :", error);
                    })
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
            utils.setDelay(this.delay).then(() => {
                this.start();
            });
        }).catch((error: Error) => {
            winston.error("Error getPusherLatestBlock ", error);
            utils.setDelay(this.delay).then(() => {
                this.start();
            });
        });
    }

    private findDevicesByAddresses(addresses: string[]) {
        return Device.find({wallets: {$in: addresses}});
    }

    private getNextPusherBlock(): Promise<number> {
        return LastParsedBlock.findOne({}).then((lastParsedBlock: any) => {
            return new Promise((resolve, reject) => {
                const lastPusherBlock = lastParsedBlock.lastPusherBlock;
                const lastBlock = lastParsedBlock.lastBlock;

                if (!lastBlock) return reject();

                if (!lastPusherBlock && lastBlock) return resolve(lastBlock);
                
                if (lastPusherBlock >= lastBlock) {
                    winston.info(`lastPusherBlock ${lastPusherBlock - lastBlock} ahead of lastBlock`);
                    return reject();
                }

                if (lastPusherBlock < lastBlock) return resolve(lastPusherBlock + 1);

                return resolve(lastBlock);
            });
        });
    }

    private getBlockTransactions(blockNumber: number): Promise<any[]> {
        return Transaction.find({blockNumber: {$eq: blockNumber}})
            .populate({
                path: "operations",
                populate: {
                    path: "contract",
                    model: "ERC20Contract"
                }
            });
    }
}
