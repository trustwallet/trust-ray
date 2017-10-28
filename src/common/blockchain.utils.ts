const Web3 = require("web3");
const EthWallet = require("ethereumjs-wallet");
import { Transaction } from "../models/transaction.model";
import { LatestBlock } from "../models/latestBlock.model";
import { Device } from "../models/device.model";


const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk"));

export class EthereumBlockchainUtils {

    public static retrieveTransactionsFromBlockchain() {
        web3.eth.getBlockNumber().then((latestBlockInChain: any) => {

            // check if something is to do
            LatestBlock.findOne({}, (err: Error, latestBlockInDb: any) => {
                if (err) {
                    return console.log("Error while finding latest block in DB");
                }
                if (!latestBlockInDb) {
                    // no block in database exists yet, initially store first
                    new LatestBlock({latestBlock: latestBlockInChain}).save().then((block: any) => {
                        console.log("Latest block saved in DB");
                    }).catch((error: Error) => {
                        console.log("Error while saving latest block to DB");
                    });
                    return;
                }

                if (latestBlockInDb.latestBlock < latestBlockInChain) {

                    // retrieve new transactions
                    for (let i = latestBlockInDb.latestBlock; i <= latestBlockInChain; i++) {
                        web3.eth.getBlock(i, true).then((block: any) => {
                            if (block !== null && block.transactions !== null) {
                                block.transactions.forEach(function (transaction: any) {

                                    // save transaction if to/from address in any of our user wallets
                                    Device.findOne({wallets: {address: {"$in": [transaction.to, transaction.from]}}},
                                        (err: Error, device: any) => {
                                            if (!err && device) {
                                                this.saveTransaction(block, transaction);
                                            }
                                        });

                                });
                            }
                        });
                    }

                    // update latest block in DB
                    LatestBlock.findOneAndUpdate({}, {latestBlock: latestBlockInChain},
                        {upsert: true}, (err: Error, transaction: any) => {
                            if (err) {
                                console.log("Error: " + err);
                            } else {
                                console.log("Success saving new latest block from chain into db");
                            }
                    });
                }
            });
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
            returnNewDocument: true}, function(err: Error, transaction: any) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("Success saving: transaction" + transaction);
            }
        });
    }

    private static convertPrivateKeyToKeystore(keyString: string) {
        const key = Buffer.from(keyString, "hex");
        const wallet = EthWallet.fromPrivateKey(key);
        return wallet.toV3String("password");
    }
}