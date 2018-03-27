import * as winston from "winston";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Token } from "../models/TokenModel";
import { TransactionParser } from "../common/TransactionParser";
import { setDelay } from "./Utils";
import { BlockchainState } from "./BlockchainState";

export class TokensParser {

    start() {
        BlockchainState.getBlockState().then(([blockInChain, blockInDb]) => {
            const lastBlock: number = blockInDb.lastBlock // temp solution until blockchain parsed from the begining. Use blockInDb.lastBlock instead
            const lastTokensBlock: number = blockInDb.lastTokensBlock
            if (lastTokensBlock < lastBlock) {
                this.startParsingNextBlock(lastTokensBlock, lastBlock)
            }
        })
    }

    startParsingNextBlock(block: number, lastBlock: number) {
        this.parseBlock(block).then((lastTokensBlock) => {
            const nextBlock: number = lastTokensBlock  + 1
            if (nextBlock < lastBlock) {
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
            const operations: any = [];
            transactions.forEach(transaction => {
                transaction.operations.forEach((operation: any) => {
                    operations.push({address: operation.to, contract: operation.contract._id})
                    operations.push({address: operation.from, contract: operation.contract._id})
                })
            })
            return this.completeBulk(this.createBulk(operations))
        }).then(() => {
            return LastParsedBlock.findOneAndUpdate({}, {lastTokensBlock: block}, {new: true}).exec().then((res: any) => res.lastTokensBlock)
        }).catch((error: Error) => {
            winston.error(`Error parsing block ${block}`, error)
        })
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
