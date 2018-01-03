import { Error } from "mongoose";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Transaction } from "../models/TransactionModel";
import { Device } from "../models/DeviceModel";
import * as winston from "winston";
import { Config } from "../common/Config";
import * as utils from "../common/Utils"
import { Notification } from "./Notification";
import { Promise, reject } from "bluebird";
import { error } from "util";

export class PusherScanner {
    private delay: number = 5000;
    private currentProcessingBlock: number;

    public start() {
        this.getPusherLatestBlock().then((block: number) => {
            winston.info("Pusher processing block :", block , new Date());
            this.currentProcessingBlock = block + 1;

            return this.getBlockTransactions(4779189).then((transactions: any[]) => {
                 return Promise.mapSeries(transactions, (transaction) => {
                    this.findDevicesByAddresses(transaction.addresses).then((devices: any[]) => {
                        // console.log('devices', devices)
                        if (devices.length >= 1) {
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

        })
        .then(() => LastParsedBlock.findOneAndUpdate({}, {$set: {lastPusherBlock: this.currentProcessingBlock}}, {upsert: true, new: true})
        .then((saveResult: any) => {
            winston.info('saveResult', saveResult);
        })
        .then((res: any) => {
            utils.setDelay(this.delay).then(() => {
                this.start();
            });
        })
        .catch((error: Error) => {
            winston.error("Error getPusherLatestBlock ", error);
            utils.setDelay(this.delay).then(() => {
                this.start();
            });
        })
    )}

    private findDevicesByAddresses(addresses: any) {
        return Device.find({wallets: {$in: addresses}});
    }

    private getPusherLatestBlock(): Promise<number> {
        return LastParsedBlock.findOne({}).then((lastParsedBlock: any) => {
            return new Promise((resolve, reject) => {
                if (lastParsedBlock && lastParsedBlock !== null) {
                    const lastPusherBlock = lastParsedBlock.lastPusherBlock;
                    if (lastPusherBlock) return resolve(lastPusherBlock);

                    const lastBlock = lastParsedBlock.lastBlock;
                    if (lastBlock) return resolve(lastBlock);
                }
            });
        }).catch((error: Error) => reject(error));
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
