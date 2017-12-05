import * as winston from "winston";
import { Config } from "./Config";
import { setDelay } from "./Utils";
import { TransactionParser } from "./TransactionParser";
import { TokenParser } from "./TokenParser";


export class ReparseService {

    private transactionParser: TransactionParser;
    private tokenParser: TokenParser;
    private concurrentBlocks = 1;

    constructor() {
        this.transactionParser = new TransactionParser();
        this.tokenParser = new TokenParser();
    }

    reparse(startBlock: any, lastBlock: any) {
        winston.info(`Reparsing from block ${startBlock} to block ${lastBlock}`);
        this.doReparse(startBlock, lastBlock);
    }

    private doReparse(startBlock: any, lastBlock: any) {
        // indicate process
        if (startBlock % 20 === 0) {
            winston.info("Currently reparsing block: " + startBlock);
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
        }).then((results: any) => {
            if (endBlock < lastBlock) {
                this.reparse(endBlock + 1, lastBlock);
            } else {
                winston.info(`Last block (${endBlock})is reparsed on the blockchain.`);
            }
        }).catch((err: Error) => {
            winston.error(`Reparsing failed for blocks ${startBlock} to ${lastBlock} with error: ${err}. \nRestarting reparsing for those blocks...`);
            setDelay(1000).then(() => {
                this.reparse(startBlock, lastBlock);
            });
        });

    }

    private flatBlocksWithMissingTransactions(blocks: any) {
        return blocks.map((block: any) => (block !== null && block.transactions !== null && block.transactions.length > 0)
            ? [block] : []).reduce( (a: any, b: any) => a.concat(b), [] );
    }


}