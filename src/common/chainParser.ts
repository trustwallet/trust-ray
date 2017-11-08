import { Transaction } from "../models/transaction.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";
import { LatestBlock } from "../models/latestBlock.model";
import { Config } from "./config";

import * as winston from "winston";

const InputDataDecoder = require("ethereum-input-data-decoder");
const erc20abi = require("./erc20abi");

export class ChainParser {

    public start() {
        winston.info("start chain parsing...");
        this.getBlockState().then(([blockInChain, blockInDB]) => {
            let startBlock: number;
            if (!blockInDB) {
                startBlock = 1
            } else {
                startBlock = blockInDB.lastBlock
            }
            const concurentBlocks = 40
            
            winston.info("blockInDB: " + startBlock + ", blockInChain: " + blockInChain);

            if (startBlock < blockInChain) {
                this.startBlock(startBlock, blockInChain, concurentBlocks);
            } else {
                this.scheduleToRestart(10000);
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

    public startBlock(startBlock: number, lastBlock: number, concurentBlocks: number) {
        if (startBlock % 20 == 0) {
            winston.info("processing block: " + startBlock);
        }
        const range = (start: number, end: number) => (
            Array.from(Array(end - start + 1).keys()).map(i => i + start)
        );
        const endBlock = startBlock + Math.min(concurentBlocks, lastBlock - startBlock);
        const numberBlocks = range(startBlock, endBlock);
        
        const promises = numberBlocks.map((number) => { return this.parseBlock(number)});
        Promise.all(promises).then((blocks: any[]) => {
            return this.saveTransactions(blocks);
        }).then((results: any) => {
            this.saveLastParsedBlock(endBlock);
            if (endBlock < lastBlock) {
                this.startBlock(endBlock + 1, lastBlock, concurentBlocks);
            } else {
                winston.info("Last block is parsed on the blockchain, waiting for new blocks");
                this.scheduleToRestart(10000)
            }
        }).catch((err: Error) => {
            winston.error("failed to parse: " + err + ". restart again startBlock: " + startBlock + ", lastBlock: " + lastBlock);
            this.startBlock(startBlock, lastBlock, concurentBlocks);
        })
    }

    private scheduleToRestart(delay: number) {
        this.delay(delay).then(() => {
            this.start()
        })
    }

    private delay(t: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, t)
        });
    }

    private parseBlock(i: number): Promise<any> {
        return Config.web3.eth.getBlock(i, true)
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

    private saveTransactions(blocks: any[]): Promise<void> {
        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
        blocks.map((block: any) => {
            block.transactions.map((transaction: any) => {
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
        });
        if (bulkTransactions.length === 0) {
            return Promise.resolve()
        }
        return bulkTransactions.execute();
    }

    private findOrCreateERC20Contract(contract: String): Promise<void> {
        return ERC20Contract.findOne({_id: contract}).exec().then((erc20contract: any) => {
            if (!erc20contract) {
                return this.getContract(contract)
            } else {
                return Promise.resolve(erc20contract)
            }
        })
    }

    private getContract(contract: String): Promise<void> {
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
        return Promise.all([p1, p2, p3, p4]).then(([name, totalSupply, decimals, symbol]: any[]) => {
            return this.updateERC20Token(contract, {name, totalSupply, decimals, symbol});
        }).catch((err: Error) => {
            winston.error(`Could not wait to get all information for contract ${contract} while processing its input with error: ${err}`);
        });
    }

    private updateERC20Token(contract: String, obj: any): Promise<void> {
        return ERC20Contract.findOneAndUpdate({_id: contract}, 
            {
                _id: contract,
                 name: obj.name, 
                 totalSupply: obj.totalSupply, 
                 decimals: obj.decimals,
                 symbol: obj.symbol
            }, {upsert: true, returnNewDocument: true}).then((res: any) => {
            return ERC20Contract.findOne({_id: contract}).exec();
        })
    }

    private processTransactionType(transaction: any) {
        const decoder = new InputDataDecoder(erc20abi);
        const result = decoder.decodeData(transaction.input);

        if (result.name === "transfer") {
            const to = result.inputs[0].toString(16).toLowerCase();
            const value = result.inputs[1].toString(10);
            const contract = transaction.to.toLowerCase();
            const from = transaction.from.toLowerCase();

            this.findOrCreateERC20Contract(contract).then((erc20contract: any) => {
                winston.info("contract found: ", erc20contract)
            }).catch((err: Error) => {
                winston.error(`Could find or create contract ${contract}, error: ${err}`);
            });
        }
    }

    private updateTokenBalance(bulkTokens: any, address: any, tokenContractAddress: string, balanceModification: number, totalSupply: any, decimals: any, symbol: any, name: any) {

        // first try to upsert and set token
        bulkTokens.find({
            address: address
        }).upsert().updateOne({
            "$setOnInsert": {
                tokens: [{
                    contractAddress: tokenContractAddress,
                    totalSupply: totalSupply,
                    name: name,
                    symbol: symbol,
                    decimals: decimals,
                    balance: balanceModification
                }]
            }
        });

        // try to increment token balance if it exists
        bulkTokens.find({
            address: address,
            tokens: {
                "$elemMatch": {
                    contractAddress: "0x1234"
                }
            }
        }).updateOne({
            "$inc": { "tokens.$.balance": balanceModification}
        });

        // "push" new token to tokens array where
        // it does not yet exist
        bulkTokens.find({
            address: address,
            tokens: {
                "$not": {
                    "$elemMatch": {
                        contractAddress: tokenContractAddress
                    }
                }
            }
        }).updateOne({
            "$push": {
                tokens: {
                    contractAddress: tokenContractAddress,
                    totalSupply: totalSupply,
                    name: name,
                    symbol: symbol,
                    decimals: decimals,
                    balance: balanceModification
                }
            }
        });
    }
}