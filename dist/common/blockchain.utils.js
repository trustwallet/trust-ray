"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Web3 = require("web3");
const EthWallet = require("ethereumjs-wallet");
const transaction_model_1 = require("../models/transaction.model");
const latestBlock_model_1 = require("../models/latestBlock.model");
class EthereumBlockchainUtils {
    static configureNetwork(network) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(network));
    }
    static parseEntireBlockchain() {
        this.web3.eth.getBlockNumber().then((latestBlockInChain) => {
            // go through entire block chain
            for (let i = 0; i <= latestBlockInChain; i++) {
                if (i % 1000 === 0) {
                    console.log(`Parsing block ${i}`);
                }
                this.web3.eth.getBlock(i, true).then((block) => {
                    if (block !== null && block.transactions !== null) {
                        block.transactions.forEach((transaction) => {
                            // save transaction if to/from address correlates to the given one
                            EthereumBlockchainUtils.saveTransaction(block, transaction);
                        });
                    }
                }).catch((err) => {
                    console.log(`Error while getting block ${i} from blockchain: ${err}`);
                });
            }
        }).catch((err) => {
            console.log(`Could not get latest block from blockchain with error: ${err}`);
        });
    }
    static retrieveNewTransactionsFromBlockchain() {
        this.web3.eth.getBlockNumber().then((latestBlockInChain) => {
            latestBlock_model_1.LatestBlock.findOne({}).exec().then((latestBlockInDb) => {
                // no block in DB yet, create
                if (!latestBlockInDb) {
                    // no block in database exists yet, initially store first
                    new latestBlock_model_1.LatestBlock({ latestBlock: latestBlockInChain }).save().then((block) => {
                        console.log("Latest block saved in DB");
                    }).catch((error) => {
                        console.log("Error while saving latest block to DB");
                    });
                    return;
                }
                // check if something is to do
                if (latestBlockInDb.latestBlock < latestBlockInChain) {
                    console.log(`Retrieving new transactions between blocks ${latestBlockInDb.latestBlock} and ${latestBlockInChain}`);
                    // retrieve new transactions
                    for (let i = latestBlockInDb.latestBlock; i <= latestBlockInChain; i++) {
                        this.web3.eth.getBlock(i, true).then((block) => {
                            if (block !== null && block.transactions !== null) {
                                block.transactions.forEach((transaction) => {
                                    // save transaction to database
                                    EthereumBlockchainUtils.saveTransaction(block, transaction);
                                });
                            }
                        }).catch((err) => {
                            console.log(`Error while getting block ${i} from blockchain: ${err}`);
                        });
                    }
                    // update latest block in DB
                    latestBlock_model_1.LatestBlock.findOneAndUpdate({}, { latestBlock: latestBlockInChain }, { upsert: true }).exec().then((transaction) => {
                        console.log("Saved latest block in DB");
                    }).catch((err) => {
                        console.log("Error updating latest block in database");
                    });
                }
            }).catch((err) => {
                console.log(`Error while finding latest block in DB: ${err}`);
            });
        }).catch((err) => {
            console.log(`Could not get latest block from blockchain with error: ${err}`);
        });
    }
    static saveTransaction(block, transaction) {
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
        transaction_model_1.Transaction.findOneAndUpdate({ hash: transaction_data.hash }, transaction_data, { upsert: true,
            returnNewDocument: true }).exec().catch((err) => {
            console.log(`Error while upserting transaction: ${err}`);
        });
    }
    static convertPrivateKeyToKeystore(keyString) {
        const key = Buffer.from(keyString, "hex");
        const wallet = EthWallet.fromPrivateKey(key);
        return wallet.toV3String("password", { kdf: "pbkdf2", cipher: "aes-128-ctr" });
    }
}
EthereumBlockchainUtils.mainNetwork = "https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk";
EthereumBlockchainUtils.web3 = new Web3(new Web3.providers.HttpProvider(EthereumBlockchainUtils.mainNetwork));
exports.EthereumBlockchainUtils = EthereumBlockchainUtils;
//# sourceMappingURL=blockchain.utils.js.map