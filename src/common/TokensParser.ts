import * as winston from "winston";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Token } from "../models/TokenModel";
import { TransactionParser } from "../common/TransactionParser";
import { setDelay } from "./Utils";
import { BlockchainState } from "./BlockchainState";

const config = require("config");

export class TokensParser {

    start(): void {        
        BlockchainState.getBlockState().then(([blockInChain, blockInDb]) => {
            if (blockInDb.lastTokensBlock < blockInDb.lastBlock) {
                this.startParsingNextBlock(blockInDb.lastTokensBlock)
            }
        })
    }

    startParsingNextBlock(block: string) {
        this.parseBlock(block).then(() => {
            setDelay(10).then(value => {
                this.startParsingNextBlock(block + 1)
            })
        }).catch(err => {
            winston.error(`startParsingNextBlock: ${err}`)
            this.scheduleParsing(block)
        })
    }

    parseBlock(block: string): Promise<any> {
        return TransactionParser.getTransactions(5258483).then(transactions => {
            let operations: any = []
            transactions.forEach(transaction => {
                transaction.operations.forEach((operation: any) => {
                    operations.push({address: operation.to, contract: operation.contract._id})
                    operations.push({address: operation.from, contract: operation.contract._id})
                })
            })
            return this.completeBulk(
                this.createBulk(operations)
            )
        }).then(() => {
            return LastParsedBlock.findOneAndUpdate({}, {$inc : {'lastTokensBlock' : 1}}).exec()
        })
    }

    scheduleParsing(block: string): void {
        setDelay(5000).then(value => {
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
                address: address
            }).upsert().updateOne({
                "$setOnInsert": {
                    address: address,
                    tokens: []
                }
            });

            bulk.find({
                address: address,
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