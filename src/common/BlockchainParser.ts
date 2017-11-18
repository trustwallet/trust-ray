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
    private concurrentBlocks = 1;

    constructor() {
        this.transactionParser = new TransactionParser();
        this.tokenParser = new TokenParser();
    }

    public startParsing() {
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
                setDelay(1000).then(() => {
                    this.startParsing();
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
                setDelay(10000).then(() => {
                    this.startParsing();
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
