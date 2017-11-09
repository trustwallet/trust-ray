import { Transaction } from "../models/transaction.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";
import { ERC20Contract } from "../models/erc20Contract.model";
import { TransactionOperation } from "../models/transactionOperation.model";
import { Token } from "../models/token.model";
import { Config } from "./config";

import * as winston from "winston";

const erc20abi = require("./erc20abi");
const erc20ABIDecoder = require('abi-decoder');
erc20ABIDecoder.addABI(erc20abi);

export class ChainParser {

    /* ====================================================================================== */
    /* ================================ PARSING TRANSACTIONS ================================ */
    /* ====================================================================================== */

    public start() {
        winston.info("start chain parsing...");
        this.getBlockState().then(([blockInChain, blockInDB]) => {
            let startBlock: number;
            if (!blockInDB) {
                startBlock = 1
            } else {
                startBlock = blockInDB.lastBlock
            }
            const concurentBlocks = 40;

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

            // ============ saving transactions ========== //
            return this.saveTransactions(blocks).then((bulkResult: any) => {
                blocks.map((block: any) => {
                    block.transactions.map((transaction: any) => {
                        if (transaction.input !== "0x") {
                            this.parseOperationFromTransaction(transaction);
                        }
                    });
                });
            });


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

    public parseBlock(i: number): Promise<any> {
        return Config.web3.eth.getBlock(i, true)
    }

    private saveLastParsedBlock(block: number) {
        return LastParsedBlock.findOneAndUpdate({}, {lastBlock: block}, {upsert: true}).catch((err: Error) => {
            winston.error(`Could not save last parsed block to DB with error: ${err}`);
        });
    }

    public saveTransactions(blocks: any[]): Promise<void> {
        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
        blocks.map((block: any) => {
            block.transactions.map((transaction: any) => {
                const hash = String(transaction.hash);
                const from = String(transaction.from).toLowerCase();
                const to = String(transaction.to).toLowerCase();
                const transaction_data: any = {
                    _id: hash,
                    blockNumber: Number(transaction.blockNumber),
                    timeStamp: String(block.timestamp),
                    nonce: Number(transaction.nonce),
                    from: from,
                    to: to,
                    value: String(transaction.value),
                    gas: String(transaction.gas),
                    gasPrice: String(transaction.gasPrice),
                    input: String(transaction.input),
                    gasUsed: String(block.gasUsed),
                    addresses: [from, to]
                };
                bulkTransactions.find({_id: hash}).upsert().replaceOne(transaction_data);
            })
        });
        if (bulkTransactions.length === 0) {
            return Promise.resolve()
        }
        return bulkTransactions.execute();
    }


    /* ====================================================================================== */
    /* ================================ PARSING ERC20 TOKENS ================================ */
    /* ====================================================================================== */

    private findOrCreateERC20Contract(contract: String): Promise<void> {
        return ERC20Contract.findOne({address: contract}).exec().then((erc20contract: any) => {
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
        return ERC20Contract.findOneAndUpdate({address: contract}, {
                 address: contract,
                 name: obj.name,
                 totalSupply: obj.totalSupply,
                 decimals: obj.decimals,
                 symbol: obj.symbol
            }, {upsert: true, returnNewDocument: true}).then((res: any) => {
            return ERC20Contract.findOne({address: contract}).exec();
        })
    }

    /* ====================================================================================== */
    /* ================================ PARSING   OPERATIONS ================================ */
    /* ====================================================================================== */

    public parseOperationFromTransaction(transaction: any) {
        const decodedInput = erc20ABIDecoder.decodeMethod(transaction.input);
        if (decodedInput && decodedInput.name === "transfer") {
            this.findOrCreateERC20Contract(transaction.to).then((erc20contract: any) => {
                this.findOrCreateTransactionOperation(transaction._id, transaction.from, decodedInput, erc20contract._id).then(() => {
                    // TODO: check later on
                    // this.updateTokenBalance(transaction.from, erc20Contract._id, parseInt(decodedInput.inputs[1].toString(10)))
                })
            }).catch((err: Error) => {
                winston.error(`Could not find contract by id for ${transaction.to} with error: ${err}`);
            });
        }
    }

    private findOrCreateTransactionOperation(transactionId: any, transactionFrom: any, decodedInput: any, erc20ContractId: any): Promise<void> {
        const from = transactionFrom.toLowerCase();
        const to = decodedInput.params[0].value.toLowerCase();
        const value = decodedInput.params[1].value;

        const data = {
            transactionID: transactionId,
            type: "token_transfer",
            from: from,
            to: to,
            value: value,
            contract: erc20ContractId
        };
        return TransactionOperation.findOneAndUpdate(data, data, {upsert: true, new: true}).then((operation: any) => {
            return Transaction.findOneAndUpdate({_id: transactionId}, {
                operation: operation._id,
                addresses: [from, to]
            }).catch((err: Error) => {
                winston.error(`Could not add operation to transaction with ID ${transactionId} with error: ${err}`)
            });
        }).catch((err: Error) => {
            winston.error(`Could not save transaction operation with error: ${err}`)
        });
    }

    private updateTokenBalance(address: any, erc20ContractId: any, balanceModification: number) {

        const bulk = Token.collection.initializeUnorderedBulkOp();

        // first try to upsert and set token
        bulk.find({
            address: address
        }).upsert().updateOne({
            "$setOnInsert": {
                tokens: [{
                    erc20Contract: erc20ContractId,
                    balance: balanceModification
                }]
            }
        });

        // try to increment token balance if it exists
        bulk.find({
            address: address,
            tokens: {
                "$elemMatch": {
                    erc20Contract: erc20ContractId
                }
            }
        }).updateOne({
            "$inc": { "tokens.$.balance": balanceModification}
        });

        // "push" new token to tokens array where it does not yet exist
        bulk.find({
            address: address,
            tokens: {
                "$not": {
                    "$elemMatch": {
                        erc20Contract: erc20ContractId
                    }
                }
            }
        }).updateOne({
            "$push": {
                tokens: {
                    erc20Contract: erc20ContractId,
                    balance: balanceModification
                }
            }
        });

        if (bulk.length > 0) {
            return bulk.execute().catch((err: Error) => {
               winston.error(`Could not update token balance for address ${address} and erc20 contract ${erc20ContractId} with error: ${err}`);
            });
        } else {
            return Promise.resolve();
        }
    }
}