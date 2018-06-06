import { Config } from "../Config";

export class BlockParser {
    public getBlockByNumber(blockNumber): Promise<any> {
        return Config.web3.eth.getBlock(blockNumber, true);
    }
}