const Web3 = require("web3");
const EthWallet = require("ethereumjs-wallet");
import { Transaction } from "../models/transaction.model";
import { LatestBlock } from "../models/latestBlock.model";
import { Device } from "../models/device.model";


export class EthereumBlockchainUtils {

    static mainNetwork = "https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk";
    static web3 = new Web3(new Web3.providers.HttpProvider(EthereumBlockchainUtils.mainNetwork));

    public static configureNetwork(network: string) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(network));
    }

    public static retrieveTransactionsFromBlockchain() {
        this.web3.eth.getBlockNumber().then((latestBlockInChain: any) => {
            LatestBlock.findOne({}).exec().then((latestBlockInDb: any) => {

                // no block in DB yet, create
                if (!latestBlockInDb) {
                    // no block in database exists yet, initially store first
                    new LatestBlock({latestBlock: latestBlockInChain}).save().then((block: any) => {
                        console.log("Latest block saved in DB");
                    }).catch((error: Error) => {
                        console.log("Error while saving latest block to DB");
                    });
                    return;
                }

                // check if something is to do
                if (latestBlockInDb.latestBlock < latestBlockInChain) {
                    console.log("Retrieving new transactions between blocks " + latestBlockInDb.latestBlock + " and " + latestBlockInChain);
                    // retrieve new transactions
                    for (let i = latestBlockInDb.latestBlock; i <= latestBlockInChain; i++) {
                        this.web3.eth.getBlock(i, true).then((block: any) => {
                            if (block !== null && block.transactions !== null) {
                                block.transactions.forEach(function (transaction: any) {
                                    // save transaction if to/from address in any of our user wallets
                                    const promise = Device.findOne({wallets: {"$in": [transaction.to, transaction.from]}}).exec();
                                    promise.then((device: any) => {
                                        if (device) {
                                            EthereumBlockchainUtils.saveTransaction(block, transaction);
                                        }
                                    }).catch((err: Error) => {
                                        console.log("Error while checking for user device: ", err);
                                    });
                                });
                            }
                        }).catch((err: Error) => {
                          console.log("Error while getting block " + i + " from blockchain: " + err);
                        });
                    }

                    // update latest block in DB
                    LatestBlock.findOneAndUpdate({}, {latestBlock: latestBlockInChain},
                        {upsert: true}).exec().then((transaction: any) => {
                        console.log("Saved latest block in DB");
                    }).catch((err: Error) => {
                        console.log("Error updating latest block in database");
                    });

                }


            }).catch((err: Error) => {
                console.log("Error while finding latest block in DB: ", err);
            });
        }).catch((err: Error) => {
            console.log("Could not get latest block from blockchain with error: ", err);
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

        const promise = Transaction.findOneAndUpdate({hash: transaction_data.hash}, transaction_data,
            {upsert: true, returnNewDocument: true}).exec();
        promise.then((transaction: any) => {
            console.log("Saved transaction to database");
        }).catch((err: Error) => {
            console.log("Error while upserting transaction: ", err);
        });

    }

    private static convertPrivateKeyToKeystore(keyString: string) {
        const key = Buffer.from(keyString, "hex");
        const wallet = EthWallet.fromPrivateKey(key);
        return wallet.toV3String("password");
    }
}