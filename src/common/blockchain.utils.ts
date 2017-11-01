const Web3 = require("web3");
const EthWallet = require("ethereumjs-wallet");
const cron = require("node-cron");
import * as winston from "winston";
import { Transaction } from "../models/transaction.model";
import { LatestBlock } from "../models/latestBlock.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";


export class EthereumBlockchainUtils {

    static network = process.env.RPC_SERVER;
    static web3 = new Web3(new Web3.providers.HttpProvider(EthereumBlockchainUtils.network));

    public static configureNetwork(network: string) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(network));
    }

    /**
     * Parse entire blockchain and store all extracted transactions.
     *
     * Every X blocks are parsed in parallel, then the latest of those
     * is saved in the last parsed block in the DB. Thereby, if the parsing
     * process is interrupted, it can be continued from there on.
     */
    public static parseEntireBlockchain() {
        // get the latest block number in the blockchain
        this.web3.eth.getBlockNumber().then((latestBlockInChain: any) => {

            // find the last parsed block in the DB that indicates where
            // to resume the full parse. If none is found, init it to 0
            LastParsedBlock.findOne({}).exec().then(async (lastParsedBlockInDb: any) => {

                if (!lastParsedBlockInDb) {
                    // init to 0
                    winston.info("No last parsed block found in DB, init with 0");
                    EthereumBlockchainUtils.saveLastParsedBlock(0);
                    lastParsedBlockInDb = new LastParsedBlock({lastBlock: 0});
                }

                /* ============== PARSING ============== */

                // always parse x blocks simultaneously, wait for them to finish,
                // save the last parsed block in DB and then continue with the next
                // x blocks
                winston.info("Picking up parsing at block " + lastParsedBlockInDb.lastBlock + " to current block " + latestBlockInChain);
                const x = 20;
                let promises = [];
                for (let i = lastParsedBlockInDb.lastBlock; i < latestBlockInChain; i++) {

                    const blockPromise = this.web3.eth.getBlock(i, true).then(async (block: any) => {
                        if (block !== null && block.transactions !== null) {

                            /* ============== save transactions ============== */
                            const transactionPromises: any = [];
                            block.transactions.forEach((transaction: any) => {
                                transactionPromises.push(EthereumBlockchainUtils.saveTransaction(block, transaction));
                            });
                            await Promise.all(transactionPromises).catch((err: Error) => {
                                winston.error(`Error while waiting for all transactions to be processed for block ${i} with error: ${err}`);
                            });
                        }
                    }).catch((err: Error) => {
                        winston.error("Could not get block " + i + " from blockchain with error: ", err);
                    });

                    promises.push(blockPromise);

                    // every x steps, wait for the blocks to be parsed
                    if (i % x === 0 && i != lastParsedBlockInDb.lastBlock) {
                        await Promise.all(promises).then(() => {
                            // save last parsed block in DB
                            EthereumBlockchainUtils.saveLastParsedBlock(i);
                        }).then(() => {
                            // and every 100th parallel process, print statement
                            if (i % (x * 10) === 0 && i != lastParsedBlockInDb.lastBlock) {
                                winston.info("Processed " + (x * 10) + " blocks, now at block " + i);
                            }
                        }).catch((err: Error) => {
                            winston.error("Could not wait for " + x + " blocks (to " + i + " ) to be processed with error: " , err);
                        });

                        // reset promise array
                        promises = [];
                    }
                }

                // wait for the remaining blocks to be parsed if any remain
                await Promise.all(promises).then(() => {
                    winston.info(`Processed rest of the blocks to block number ${latestBlockInChain}`);
                    winston.info(`Finished full parse, saving block number ${latestBlockInChain} to last parsed block and latest block in DB`);

                    // save last parsed block in DB
                    EthereumBlockchainUtils.saveLastParsedBlock(latestBlockInChain);

                    // AND also save last block in DB for the steady refreshes
                    EthereumBlockchainUtils.saveLatestBlock(latestBlockInChain);

                    // and start the cron job for steady refreshes
                    cron.schedule("*/15 * * * * *", () => {
                        EthereumBlockchainUtils.retrieveNewTransactionsFromBlockchain();
                    });
                }).catch((err: Error) => {
                    winston.error(`Could not wait for rest of blocks (to ${latestBlockInChain}) to be processed with error: ${err}`);
                });
            }).catch((err: Error) => {
                winston.error(`Could not find last parsed block in DB with error: ${err}`);
            });
        }).catch((err: Error) => {
            winston.error(`Could not get currently latest block number from blockchain with error: ${err}`);
        });
    }

    public static retrieveNewTransactionsFromBlockchain() {
        this.web3.eth.getBlockNumber().then((latestBlockInChain: any) => {
            LatestBlock.findOne({}).exec().then((latestBlockInDb: any) => {
                // no block in DB yet, create
                if (!latestBlockInDb) {
                    EthereumBlockchainUtils.saveLatestBlock(latestBlockInChain);
                    return;
                }
                // check if something is to do
                if (latestBlockInDb.latestBlock < latestBlockInChain) {
                    winston.info(`Retrieving new transactions between blocks ${latestBlockInDb.latestBlock} and ${latestBlockInChain}`);
                    // retrieve new transactions
                    const promises = [];
                    for (let i = latestBlockInDb.latestBlock; i <= latestBlockInChain; i++) {
                        const blockPromise = this.web3.eth.getBlock(i, true).then((block: any) => {
                            if (block !== null && block.transactions !== null) {
                                block.transactions.forEach((transaction: any) => {
                                    // save transaction to database
                                    EthereumBlockchainUtils.saveTransaction(block, transaction);
                                });
                            }
                        }).catch((err: Error) => {
                            winston.error(`Could not get block ${i} from blockchain with error: ${err}`);
                        });
                        promises.push(blockPromise);
                    }
                    // update latest block in DB after each new block was processed
                    Promise.all(promises).then(() => {
                        EthereumBlockchainUtils.saveLatestBlock(latestBlockInChain);
                    });
                }
            }).catch((err: Error) => {
                winston.error(`Could not find latest block in DB with error: ${err}`);
            });
        }).catch((err: Error) => {
            winston.error(`Could not get latest block from blockchain with error: ${err}`);
        });
    }

    private static async saveTransaction(block: any, transaction: any) {
        const transaction_data = {
            blockNumber: String(transaction.blockNumber),
            timeStamp: String(block.timestamp),
            hash: String(transaction.hash),
            nonce: String(transaction.nonce),
            blockHash: String(block.hash),
            transactionIndex: String(transaction.transactionIndex),
            from: String(transaction.from),
            to: String(transaction.to),
            value: String(transaction.value),
            gas: String(transaction.gas),
            gasPrice: String(transaction.gasPrice),
            input: String(transaction.input),
            gasUsed: String(block.gasUsed)
        };

        const promise = Transaction.findOneAndUpdate({hash: transaction_data.hash}, transaction_data, {
            upsert: true,
            returnNewDocument: true
        }).exec();
        promise.catch((err: Error) => {
            winston.error(`Could not upsert transaction with error: ${err}`);
        });

        return promise;
    }

    private static saveLastParsedBlock(block: number) {
        const promise = LastParsedBlock.findOneAndUpdate({}, {lastBlock: block}, {upsert: true}).exec();
        promise.catch((err: Error) => {
            winston.error(`Could not save last parsed block to DB with error: ${err}`);
        });
        return;
    }

    private static saveLatestBlock(block: number) {
        const promise = LatestBlock.findOneAndUpdate({}, {latestBlock: block}, {upsert: true}).exec();
        promise.catch((err: Error) => {
            winston.error(`Could not save latest block to DB with error: ${err}`);
        });
        return;
    }

    private static convertPrivateKeyToKeystore(keyString: string) {
        const key = Buffer.from(keyString, "hex");
        const wallet = EthWallet.fromPrivateKey(key);
        return wallet.toV3String("MyPassword!", {kdf: "pbkdf2", cipher: "aes-128-ctr"});
    }
}