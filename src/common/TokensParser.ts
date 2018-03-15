import * as winston from "winston";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Token } from "../models/TokenModel";
import { TransactionParser } from "../common/TransactionParser";
import { setDelay } from "./Utils";
import { BlockchainState } from "./BlockchainState";

export class TokensParser {

    start(): void {
        BlockchainState.getBlockState().then(([blockInChain, blockInDb]) => {
            const lastBlock = 1266374 // temp solution until blockchain parsed from the begining. Use blockInDb.lastBlock instead
            if (blockInDb.lastTokensBlock < lastBlock) {
                this.startParsingNextBlock(blockInDb.lastTokensBlock, lastBlock)
            }
        })
    }

    startParsingNextBlock(block: number, lastBlock: number) {
        this.parseBlock(block).then(() => {
            if (block < lastBlock) {
                return this.startParsingNextBlock(block + 1, lastBlock)
            } else {
                this.scheduleParsing(block)
            }
        }).catch(err => {
            winston.error(`startParsingNextBlock: ${err}`)
            this.scheduleParsing(block)
        })
    }

    parseBlock(block: number): Promise<any> {
        return TransactionParser.getTransactions(block).then(transactions => {
            const operations: any = [];
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
            return LastParsedBlock.findOneAndUpdate({}, {$inc : {"lastTokensBlock" : 1}}).exec()
        })
    }

    scheduleParsing(block: number): void {
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