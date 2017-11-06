import { Transaction } from "../models/transaction.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";
import { LatestBlock } from "../models/latestBlock.model";
import { Config } from "../common/config";

import * as winston from "winston";

export class ChainParser {

    start() {
        winston.info("start chain parsing...");
        this.getBlockState().then(([blockInChain, blockInDB]) => {
            winston.info("blockInChain: " + blockInChain + " blockInDB: " + blockInDB);
            if (!blockInDB) {
                this.startBlock(0, blockInChain);
            } else {
                this.startBlock(blockInDB.lastBlock, blockInChain);
            }
        }).catch((err: Error) => {
            winston.error("Failed to load initial block state: " + err);
        });
    }

    getBlockState(): Promise<any[]> {
        const latestBlockOnChain = Config.web3.eth.getBlockNumber();
        const latestBlockInDB = LastParsedBlock.findOne();
        return Promise.all([latestBlockOnChain, latestBlockInDB]);
    }

    startBlock(startBlock: number, lastBlock: number) {
        if (startBlock % 200 == 0) {
            winston.info("processing block: " + startBlock);
        }
        this.parseBlock(startBlock).then((res: any) => {
            this.saveLastParsedBlock(startBlock);
            if (startBlock < lastBlock) {
                this.startBlock(startBlock + 1, lastBlock);
            }
        }).catch((err: Error) => {
            winston.error("failed to parse: " + err + ". restart again startBlock: " + startBlock + ", lastBlock: " + lastBlock);
            this.delay(1000).then(() => {
                this.startBlock(startBlock, lastBlock);
            })
        })
    }

    private delay(t: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, t)
        });
    }

    private parseBlock(i: number): Promise<any> {
        return Config.web3.eth.getBlock(i, true).then((block: any) => {
            return this.saveTransactions(block, i);
        })
    }

    private saveLatestBlock(block: number) {
        winston.info("saveLatestBlock: " + block);
        return LatestBlock.findOneAndUpdate({}, {latestBlock: block}, {upsert: true}).catch((err: Error) => {
            winston.error(`Could not save latest block to DB with error: ${err}`);
        });
    }

    private saveLastParsedBlock(block: number) {
        return LastParsedBlock.findOneAndUpdate({}, {lastBlock: block}, {upsert: true}).catch((err: Error) => {
            winston.error(`Could not save last parsed block to DB with error: ${err}`);
        });
    }

    private async saveTransactions(block: any, i: number): Promise<void> {
        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
        block.transactions.map(async (transaction: any) => {
            const hash = String(transaction.hash);
            const transaction_data: any = {
                _id: hash,
                blockNumber: Number(transaction.blockNumber),
                timeStamp: String(block.timestamp),
                nonce: Number(transaction.nonce),
                from: String(transaction.from).toLowerCase(),
                to: String(transaction.to).toLowerCase(),
                value: String(transaction.value),
                gas: String(transaction.gas),
                gasPrice: String(transaction.gasPrice),
                input: String(transaction.input),
                gasUsed: String(block.gasUsed)
            };
            bulkTransactions.find({_id: hash}).upsert().replaceOne(transaction_data);
        })
        if (bulkTransactions.length === 0) {
            return Promise.resolve()
        }
        await bulkTransactions.execute().catch((err: Error) => {
            winston.error("Could not wait for blocks (to " + i + " ) to be processed with error: " , err);
        });
    }
}