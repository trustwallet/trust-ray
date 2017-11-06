import { Transaction } from "../models/transaction.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";
import { LatestBlock } from "../models/latestBlock.model";
import { Config } from "./config";

import * as winston from "winston";

const InputDataDecoder = require("ethereum-input-data-decoder");
const erc20abi = require("./erc20abi");


export class ChainParser {

    private contractsCache: any = {};

    public start() {
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

    public getBlockState(): Promise<any[]> {
        const latestBlockOnChain = Config.web3.eth.getBlockNumber();
        const latestBlockInDB = LastParsedBlock.findOne();
        return Promise.all([latestBlockOnChain, latestBlockInDB]);
    }

    public startBlock(startBlock: number, lastBlock: number) {
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

    private processTransactionType(transaction: any) {
        const decoder = new InputDataDecoder(erc20abi);
        const result = decoder.decodeData(transaction.input);

        if (result.name === "transfer") {
            const to = result.inputs[0].toString(16).toLowerCase();
            const value = result.inputs[1].toString(10);
            const contract = transaction.to.toLowerCase();
            const from = transaction.from.toLowerCase();

            if (this.contractsCache.hasOwnProperty(contract)) {

                // contract is cached, returned immediately

                return {
                    transactionType: "token_transfer",
                    contract: contract,
                    to: to,
                    from: from,
                    value: value,
                    name: this.contractsCache[contract].name,
                    totalSupply: this.contractsCache[contract].totalSupply,
                    decimals: this.contractsCache[contract].decimals,
                    symbol: this.contractsCache[contract].symbol
                };

            } else {

                // contract is not cached, initiate contract
                // in order to get required attributes

                const contractInstance = new Config.web3.eth.Contract(erc20abi, contract);

                const p1 = contractInstance.methods.name().call().catch((err: Error) => {
                    winston.error(`Could not get name of contract ${contract} with error: ${err}`);
                });
                const p2 = contractInstance.methods.totalSupply().call().catch((err: Error) => {
                    winston.error(`Could not get total supply of contract ${contract} with error: ${err}`);
                });
                const p3 = contractInstance.methods.decimals().call().catch((err: Error) => {
                    winston.error(`Could not get decimals of contract ${contract} with error: ${err}`);
                });
                const p4 = contractInstance.methods.symbol().call().catch((err: Error) => {
                    winston.error(`Could not get symbol of contract ${contract} with error: ${err}`);
                });

                return Promise.all([p1, p2, p3, p4]).then((values: any) => {

                    // cache values for next access
                    this.contractsCache[contract] = {
                        name: values[0],
                        totalSupply: values[1],
                        decimals: values[2],
                        symbol: values[3]
                    };

                    return {
                        transactionType: "token_transfer",
                        contract: contract,
                        to: to,
                        from: from,
                        value: value,
                        name: values[0],
                        totalSupply: values[1],
                        decimals: values[2],
                        symbol: values[3]
                    };

                }).catch((err: Error) => {
                    winston.error(`Could not wait to get all information for contract ${contract} while processing its input with error: ${err}`);
                });
            }
        }
    }
}