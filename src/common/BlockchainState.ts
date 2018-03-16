import * as winston from "winston";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { setDelay } from "./Utils";
const config = require("config");

export class BlockchainState {
    getState(): Promise<any> {        
        return BlockchainState.getBlockState().then(([blockInChain, blockInDb]) => {
            if (!blockInDb) {
                return new LastParsedBlock({
                    lastBlock: blockInChain,
                    lastBackwardBlock: blockInChain,
                    lastPusherBlock: blockInChain
                }).save()
            }

            if (!blockInDb.lastBlock) {
                blockInDb.lastBlock = blockInChain
            }

            if (!blockInDb.lastBackwardBlock) {
                blockInDb.lastBackwardBlock = blockInChain
            }

            if (!blockInDb.lastPusherBlock) {
                blockInDb.lastPusherBlock = blockInChain
            }

            if (!blockInDb.lastTokensBlock) {
                blockInDb.lastTokensBlock = 1
            }

            return blockInDb.save()
        })
    }

    static getBlockState(): Promise<any[]> {
        const latestBlockOnChain = Config.web3.eth.getBlockNumber();
        const latestBlockInDB = LastParsedBlock.findOne();
        return Promise.all([latestBlockOnChain, latestBlockInDB]);
    }
}
