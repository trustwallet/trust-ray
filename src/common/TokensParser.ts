import * as winston from "winston";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Token } from "../models/TokenModel";
import { TransactionParser } from "../common/TransactionParser";
import { setDelay } from "./Utils";
import { BlockchainState } from "./BlockchainState";

export class TokensParser {

    private rebalanceOffsets: number = 20
    
    start() {
        BlockchainState.getBlockState().then(([blockInChain, blockInDb]) => {
            const lastBlock: number = blockInDb.lastBlock
            const lastTokensBlock: number = blockInDb.lastTokensBlock
            if (lastTokensBlock <= lastBlock) {
                this.startParsingNextBlock(lastTokensBlock, lastBlock)
            } else {
                this.scheduleParsing()
            }
        })
    }

    startParsingNextBlock(block: number, lastBlock: number) {
        const rebalanceBlock = block - this.rebalanceOffsets
        const rebalanceBlockActive = (lastBlock - block < 20)
        const promises = [this.parseBlock(block)]
        if (rebalanceBlock > 0 && rebalanceBlockActive) {
            promises.push(this.parseBlock(rebalanceBlock))
        }
        Promise.all(promises).then(() => {
            return LastParsedBlock.findOneAndUpdate({}, {lastTokensBlock: block}, {new: true}).exec().then((res: any) => res.lastTokensBlock)
        }).then(lastTokensBlock => {
            const nextBlock: number = lastTokensBlock + 1
            if (nextBlock <= lastBlock) {
                setDelay(10).then(() => { this.startParsingNextBlock(nextBlock, lastBlock)} )
            } else {
                this.scheduleParsing()
            }
        }).catch(err => {
            winston.error(`startParsingNextBlock: ${err}`)
            this.scheduleParsing()
        })
    }

    parseBlock(block: number): Promise<any> {
        return TransactionParser.getTransactions(block).then(transactions => {
            const operations = this.createOperations(transactions)
            return this.completeBulk(this.createBulk(operations))
        }).catch((error: Error) => {
            winston.error(`Error parsing block ${block}`, error)
        })
    }

    parseAddress(address: string) {
        winston.error(`start ${address}`)
        return TransactionParser.getTransactionsForAddress(address).then(transactions => {
            const operations = this.createOperations(transactions)
            return this.completeBulk(this.createBulk(operations))
        }).then(() => {
            winston.error(`done`)
        }).catch((error: Error) => {
            winston.error(`Error parsing block ${address}`, error)
        })
    }

    createOperations(transactions: any[]) {
        const operations: any = [];
        transactions.forEach(transaction => {
            transaction.operations.forEach((operation: any) => {
                operations.push({address: operation.to, contract: operation.contract._id})
                operations.push({address: operation.from, contract: operation.contract._id})
            })
        })
        return operations
    }

    scheduleParsing() {
        setDelay(5000).then(() => {
            this.start()
        })
    }

    completeBulk(bulk: any): Promise<any> {
        if (bulk.length > 0) {
            return bulk.execute().catch((err: Error) => {
                winston.error(`Could not update token with error: ${err}`);
            });
        } else {
            return Promise.resolve();
        }
    }

    createBulk(operations: any) {
        const bulk = Token.collection.initializeUnorderedBulkOp();
        operations.forEach((operation: any) => {
            const contract = operation.contract
            const address = operation.address

            bulk.find({
                _id: address
            }).upsert().updateOne({
                "$setOnInsert": {
                    _id: address,
                    tokens: []
                }
            });

            bulk.find({
                _id: address,
                tokens: {
                    "$not": {
                        "$elemMatch": {
                            "$in": [contract]
                        }
                    }
                }
            }).updateOne({
                "$push": {
                    tokens: contract
                }
            });
        })
        return bulk
    }
}