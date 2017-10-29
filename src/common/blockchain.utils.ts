const Web3 = require("web3");
const EthWallet = require("ethereumjs-wallet");
const cron = require("node-cron");
import * as winston from "winston";
import { Transaction } from "../models/transaction.model";
import { LatestBlock } from "../models/latestBlock.model";


export class EthereumBlockchainUtils {

    static mainNetwork = "https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk";
    static web3 = new Web3(new Web3.providers.HttpProvider(EthereumBlockchainUtils.mainNetwork));

    public static configureNetwork(network: string) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(network));
    }

    /**
     * Parse entire blockchain and store all extracted transactions.
     */
    public static parseEntireBlockchain() {
        // get the latest block number in the blockchain
        this.web3.eth.getBlockNumber().then((latestBlockInChain: any) => {

            // PARSING
            winston.info("Parsing entire blockchain");
            const promises = [];
            for (let i = 0; i <= latestBlockInChain; i++) {
                const blockPromise = this.web3.eth.getBlock(i).then((block: any) => {
                    if (block !== null && block.transactions !== null) {

                        // save all transactions in current block
                        block.transactions.forEach(function (transaction: any) {
                            EthereumBlockchainUtils.saveTransaction(block, transaction);
                        });

                    }
                }).catch((err: Error) => {
                    winston.error("Could not get block " + i + " from blockchain with error: ", err);
                });
                promises.push(blockPromise);
            }
            // wait until all blocks are fully parsed, then set the latest block in DB for
            // starting the refreshing from the point where the full parse left
            Promise.all(promises).then(() => {
                winston.info("Saving latest block number " + latestBlockInChain + " to DB after full parse");
                EthereumBlockchainUtils.saveLatestBlock(latestBlockInChain);

                // and start the cron job for steady refreshs
                // setup cron job for refreshing transactions fro blockchain
                cron.schedule("*/15 * * * * *", () => {
                    EthereumBlockchainUtils.retrieveNewTransactionsFromBlockchain();
                });

            });
        }).catch((err: Error) => {
            winston.error("Could not get currently latest block number from blockchain with error: ", err);
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
                    winston.info("Retrieving new transactions between blocks " + latestBlockInDb.latestBlock + " and " + latestBlockInChain);
                    // retrieve new transactions
                    const promises = [];
                    for (let i = latestBlockInDb.latestBlock; i <= latestBlockInChain; i++) {
                        const blockPromise = this.web3.eth.getBlock(i, true).then((block: any) => {
                            if (block !== null && block.transactions !== null) {
                                block.transactions.forEach(function (transaction: any) {
                                    // save transaction to database
                                    EthereumBlockchainUtils.saveTransaction(block, transaction);
                                });
                            }
                        }).catch((err: Error) => {
                            winston.error("Could not get block " + i + " from blockchain with error: ", err);
                        });
                        promises.push(blockPromise);
                    }
                    // update latest block in DB after each new block was processed
                    Promise.all(promises).then(() => {
                        EthereumBlockchainUtils.saveLatestBlock(latestBlockInChain);
                    });
                }
            }).catch((err: Error) => {
                winston.error("Could not find latest block in DB with error: ", err);
            });
        }).catch((err: Error) => {
            winston.error("Could not get latest block from blockchain with error: ", err);
        });
    }

    private static saveTransaction(block: any, transaction: any) {
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

        Transaction.findOneAndUpdate({hash: transaction_data.hash}, transaction_data, {upsert: true,
            returnNewDocument: true}).exec().catch((err: Error) => {
            winston.error("Error while upserting transaction: ", err);
        });

    }

    private static saveLatestBlock(block: number) {
        const promise = LatestBlock.findOneAndUpdate({}, {latestBlock: block}, {upsert: true}).exec();
        promise.catch((err: Error) => {
            winston.error("Could not save latest block to DB with error: ", err);
        });
        return;
    }

    private static convertPrivateKeyToKeystore(keyString: string) {
        const key = Buffer.from(keyString, "hex");
        const wallet = EthWallet.fromPrivateKey(key);
        return wallet.toV3String("MyPassword!", {kdf: "pbkdf2", cipher: "aes-128-ctr"});
    }
}