import * as winston from "winston";

import { TransactionParser } from "./TransactionParser";
import { TokenParser } from "./TokenParser";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { setDelay } from "./Utils";
import { ParsedBlocks } from "../models/ParsedBlocks";


/**
 * Parses the blockchain for transactions and tokens.
 * Delegates most of the work to the TransactionParser
 * and TokenParser classes. Mainly responsible for
 * coordinating the flow.
 */
export class BlockchainParser {

    private transactionParser: TransactionParser;
    private tokenParser: TokenParser;
    private concurrentBlocks = 1;

    constructor() {
        this.transactionParser = new TransactionParser();
        this.tokenParser = new TokenParser();
    }

    /**
     * Will parse the entire blockchain starting from the last
     * block and moving towards the start of the blockchain. This
     * way the more recent transactions are available earlier.
     */
    public startBackwardParsing() {
        winston.info("Starting blockchain parse");
        this.getCurrentBlockState().then(([blockInChain, blockInDb]) => {

            // parse newest blocks since last start
            // if (blockInDb && blockInDb.latestBlock < blockInChain) {
            //      this.reverseParse(blockInChain, blockInDb.latestBlock);
            // }

            // determine where to start parsing
            const currentBlock = !blockInDb ? blockInChain : blockInDb.lastBlock;
            const latestBlock = !blockInDb ? blockInChain : blockInDb.latestBlock;
            winston.info(`Last parsed block: ${currentBlock}`);

            // check if we still have something to parse
            if (currentBlock > 0) {
                this.reverseParse(currentBlock, latestBlock);
            } else {
                // if nothing to parse left, restart in 5 sec to catch newest blocks
                setDelay(5000).then(() => {
                    this.startBackwardParsing();
                });
            }
        }).catch((err: Error) => {
            winston.error("Failed to load initial block state: " + err);
        });
    }

    private getCurrentBlockState() {
        const latestBlockOnChain = Config.web3.eth.getBlockNumber();
        const latestBlockInDB = ParsedBlocks.findOne();
        return Promise.all([latestBlockOnChain, latestBlockInDB]);
    }

    private reverseParse(currentBlock: number, latestBlock: number) {
        // indicate process
        if (currentBlock % 20 === 0) {
            winston.info("Currently processing block: " + currentBlock);
        }

        Config.web3.eth.getBlock(currentBlock, true).then((block: any) => {
            return this.transactionParser.parseTransactions(this.flatBlocksWithMissingTransactions([block]));
        }).then((transactions: any) => {
            return this.tokenParser.parseERC20Contracts(transactions);
        }).then(([transactions, contracts]: any) => {
            return this.transactionParser.parseTransactionOperations(transactions, contracts);
        }).then((results: any) => {

            this.updateParsedBlocks(currentBlock, latestBlock);
            if (currentBlock > 0) {
                this.reverseParse(currentBlock - 1, latestBlock);
            } else {
                winston.info("Last block is parsed on the blockchain, waiting for new blocks");
                setDelay(1000).then(() => {
                    this.startBackwardParsing();
                });
            }

        }).catch((err: Error) => {
            winston.error(`Parsing failed for block ${currentBlock} with error: ${err}. \nRestarting parsing for this block...`);
            setDelay(1000).then(() => {
                this.reverseParse(currentBlock, latestBlock);
            });
        });
    }

    private updateParsedBlocks(lastParsedBlock: number, latestBlock: number) {
        return ParsedBlocks.findOneAndUpdate({}, {lastBlock: lastParsedBlock, latestBlock: latestBlock}, {upsert: true}).catch((err: Error) => {
            winston.error(`Could not update parsed blocks to DB with error: ${err}`);
        });
    }

    public startForwardParsing() {
        winston.info("Starting blockchain parse");
        this.getBlockState().then(([blockInChain, blockInDb]) => {

            // determine where to start parsing
            const startBlock = !blockInDb ? 1 : blockInDb.lastBlock;
            winston.info(`Last parsed block: ${startBlock}, current block in chain: ${blockInChain}`);

            // determine if we should start parsing now
            // or schedule a restart in 10 seconds
            if (startBlock < blockInChain) {
                this.parse(startBlock, blockInChain);
            } else {
                setDelay(5000).then(() => {
                    this.startForwardParsing();
                });
            }

        }).catch((err: Error) => {
            winston.error("Failed to load initial block state: " + err);
        });
    }

    private getBlockState(): Promise<any[]> {
        const latestBlockOnChain = Config.web3.eth.getBlockNumber();
        const latestBlockInDB = LastParsedBlock.findOne();
        return Promise.all([latestBlockOnChain, latestBlockInDB]);
    }

    private parse(startBlock: number, lastBlock: number) {
        // indicate process
        if (startBlock % 20 === 0) {
            winston.info("Currently processing block: " + startBlock);
        }

        // prepare block parsing
        const range = (start: number, end: number) => (
            Array.from(Array(end - start + 1).keys()).map(i => i + start)
        );
        const endBlock = startBlock + Math.min(this.concurrentBlocks, lastBlock - startBlock);
        const numberBlocks = range(startBlock, endBlock);

        // parse blocks
        const promises = numberBlocks.map((number) => {
            return Config.web3.eth.getBlock(number, true);
        });
        Promise.all(promises).then((blocks: any) => {
            return this.transactionParser.parseTransactions(this.flatBlocksWithMissingTransactions(blocks));
        }).then((transactions: any) => {
            return this.tokenParser.parseERC20Contracts(transactions);
        }).then(([transactions, contracts]: any) => {
            return this.transactionParser.parseTransactionOperations(transactions, contracts);
        // TODO: finish this
        // }).then((transactionOperations: any) => {
        //    return this.tokenParser.updateTokenBalances(transactionOperations);
        }).then((results: any) => {
            this.saveLastParsedBlock(endBlock);
            if (endBlock < lastBlock) {
                this.parse(endBlock + 1, lastBlock);
            } else {
                winston.info("Last block is parsed on the blockchain, waiting for new blocks");
                setDelay(1000).then(() => {
                    this.startForwardParsing();
                });
            }
        }).catch((err: Error) => {
            winston.error(`Parsing failed for blocks ${startBlock} to ${lastBlock} with error: ${err}. \nRestarting parsing for those blocks...`);
            setDelay(1000).then(() => {
                this.parse(startBlock, lastBlock);
            });
        });
    }

    private saveLastParsedBlock(block: number) {
        return LastParsedBlock.findOneAndUpdate({}, {lastBlock: block}, {upsert: true}).catch((err: Error) => {
            winston.error(`Could not save last parsed block to DB with error: ${err}`);
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
