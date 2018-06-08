import * as winston from "winston";

import { Config } from "../Config";

export class BlockParser {
    public getBlockByNumber(blockNumber): Promise<any> {
        winston.info(`BlockParser.getBlockByNumber(${blockNumber})`);
        return Config.web3.eth.getBlock(blockNumber, true);
    }
}