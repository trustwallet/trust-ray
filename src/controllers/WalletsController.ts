import { Wallet } from "../models/WalletModel";
import * as winston from "winston";

export class WalletsController {
    register(wallet: string) {
        Wallet.findOneAndUpdate({walletAddress: wallet}, {walletAddress: wallet}, {upsert: true, new: true}).then(() => {
        }).catch((error: Error) => {
            winston.error(`Could not add wallet to the list `, error);
        })
    }
}