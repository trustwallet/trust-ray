import * as winston from "winston";

import { TransactionParser } from "./TransactionParser";
import { TokenParser } from "./TokenParser";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { setDelay } from "./Utils";


/**
 * Parses the blockchain for transactions and tokens.
 * Delegates most of the work to the TransactionParser
 * and TokenParser classes. Mainly responsible for
 * coordinating the flow.
 */
export class BlockchainParser {

    private transactionParser: TransactionParser;
    private tokenParser: TokenParser;
    private concurrentBlocks: number = 1;
    private rebalanceOffsets: number[] = [30];

    constructor() {
        this.transactionParser = new TransactionParser();
        this.tokenParser = new TokenParser();
    }

    public start() {
        this.startForwardParsing();
        this.startBackwardParsing();
    }

    public startForwardParsing() {
        // winston.info("Starting blockchain parse");
        return this.getBlockState().then(([blockInChain, blockInDb]) => {
            // determine where to start parsing
            const startBlock = blockInDb ? blockInDb.lastBlock : blockInChain - 1;
            // determine if we should start parsing now
            // or schedule a restart in 10 seconds
            winston.info(`Last parsed block in DB ${startBlock}, current block in chain: ${blockInChain}. Difference ${blockInChain - startBlock}`);

            const nextBlock: number = startBlock + 1;
            if (nextBlock <= blockInChain) {
                winston.info("Start parsing block", nextBlock);

                const lastBlock = blockInChain
                this.parse(nextBlock, blockInChain).then((endBlock: number) => {
                    return this.saveLastParsedBlock(endBlock);
                }).then((saved: {lastBlock: number}) => {
                    winston.info("New latest block in DB :", saved.lastBlock);
                    return setDelay(100);
                }).then(() =>  {
                    return this.startForwardParsing();
                }).catch((err: Error) => {
                    winston.error(`Forward parsing failed for blocks ${nextBlock} to ${lastBlock} with error: ${err}. \nRestarting parsing for those blocks...`);
                    this.scheduleForwardParsing();
                });
            } else {
                winston.info("Last block is parsed on the blockchain, waiting for new blocks");
                this.scheduleForwardParsing();
            }
        }).catch((err: Error) => {
            winston.error("Failed to load initial block state in startForwardParsing: " + err);
            this.scheduleForwardParsing();
        });
    }

    public startBackwardParsing() {
        return this.getBlockState().then(([blockInChain, blockInDb]) => {
            const startBlock = !blockInDb ? blockInChain : (((blockInDb.lastBackwardBlock == undefined) ? blockInChain : blockInDb.lastBackwardBlock));

            winston.info(`Backward parsing: startBlock ${startBlock}, blockInChain: ${blockInChain}`);
            const nextBlock = startBlock - 1;
            if (nextBlock < 1) {
                winston.info(`Backward already finished`);
                return;
            }

            if (nextBlock >= blockInChain) {
                return this.scheduleBackwardParsing();
            }

            this.parse(nextBlock, blockInChain, false).then((endBlock: number) => {
                return this.saveLastBackwardBlock(endBlock);
            }).then((block) => {
                return setDelay(300).then(() => {
                    if (block.lastBackwardBlock > 1) {
                        return this.startBackwardParsing();
                    } else {
                        winston.info(`Finished parsing backward`);
                    }
                })
            }).catch((err: Error) => {
                winston.error(`Backword parsing failed for blocks ${nextBlock} with error: ${err}. \nRestarting parsing for those blocks...`);
                this.scheduleBackwardParsing();
            });
        }).catch((err: Error) => {
            winston.error("Failed to load initial block state in startBackwardParsing: " + err);
            this.scheduleBackwardParsing();
        });
    }

    private scheduleForwardParsing() {
        setDelay(3000).then(() => {
            this.startForwardParsing();
        });
    }

    private scheduleBackwardParsing() {
        setDelay(2000).then(() => {
            this.startBackwardParsing();
        });
    }

    private getBlockState(): Promise<any[]> {
        const latestBlockOnChain = Config.web3.eth.getBlockNumber();
        const latestBlockInDB = LastParsedBlock.findOne();
        return Promise.all([latestBlockOnChain, latestBlockInDB]);
    }

    getBlocksRange(start: number, end: number): number[] {
        return Array.from(Array(end - start + 1).keys()).map((i: number) => i + start);
    }

    getBlocksToParse(startBlock: number, lastBlock: number, concurrentBlocks: number) {
        return Math.min(concurrentBlocks, Math.min(lastBlock - startBlock + 1), 1);
    }

    getNumberBlocks(startBlock: number, lastBlock: number, ascending: boolean, rebalanceOffsets: number[]): number[] {
        const blocksToProcess = this.getBlocksToParse(startBlock, lastBlock, this.concurrentBlocks);
        const sBlock: number = ascending ? startBlock : Math.max(startBlock - blocksToProcess + 1, 0);
        const numberBlocks: number[] = this.getBlocksRange(sBlock, startBlock + blocksToProcess - 1);

        if (lastBlock - startBlock < 10 && ascending) {
            rebalanceOffsets.forEach((rebalanceOffset: number) => {
                const rebalanceBlock: number = startBlock - rebalanceOffset;
                if (rebalanceBlock > 0) {
                    numberBlocks.unshift(rebalanceBlock);
                }
            });
        }


        return numberBlocks;
    }
    private parse(startBlock: number, lastBlock: number, ascending: boolean = true): Promise<number> {
        // indicate process
        if (startBlock % 20 === 0) {
            winston.info("Currently processing block: " + startBlock + ", lastBlock: " + lastBlock + ",  ascending: " + ascending);
        }

        const numberBlocks = this.getNumberBlocks(startBlock, lastBlock, ascending, this.rebalanceOffsets);
        // parse blocks
        const promises = numberBlocks.map((number) => {
            return Config.web3.eth.getBlock(number, true);
        });
        return Promise.all(promises).then((blocks: any) => {
            const hasNullBlocks = blocks.filter((block: any) => block === null);
            if (hasNullBlocks.length > 0) {
                return Promise.reject("Has null blocks. Wait for RPC to build a block");
            }
            return this.transactionParser.parseTransactions(this.flatBlocksWithMissingTransactions(blocks));
        }).then((transactions: any) => {
            return this.tokenParser.parseERC20Contracts(transactions);
        }).then(([transactions, contracts]: any) => {
            return this.transactionParser.parseTransactionOperations(transactions, contracts);
        }).then(() => {
            const endBlock = numberBlocks[numberBlocks.length - 1];
            if (endBlock) {
                return Promise.resolve(endBlock);
            } else {
                return Promise.reject(endBlock);
            }
        });
    }

    private saveLastParsedBlock(block: number) {
        return LastParsedBlock.findOneAndUpdate({}, {lastBlock: block}, {upsert: true, new: true}).catch((err: Error) => {
            winston.error(`Could not save last parsed block to DB with error: ${err}`);
        });
    }

    private saveLastBackwardBlock(block: number) {
        return LastParsedBlock.findOneAndUpdate({}, {lastBackwardBlock: block}, {upsert: true}).catch((err: Error) => {
            winston.error(`Could not save lastest backward block to DB with error: ${err}`);
        });
    }

    private flatBlocksWithMissingTransactions(blocks: any) {
        return blocks
            .map((block: any) => (block !== null && block.transactions !== null && block.transactions.length > 0)
                ? [block]
                : [])
            .reduce( (a: any, b: any) => a.concat(b), [] );
    }

}
