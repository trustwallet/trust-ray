
import { Response } from "express";
const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const tx = require("ethereumjs-tx");
import { Transaction } from "../models/transaction.model";

/**
 * Fills the status and JSOn data into a response object.
 * @param res response object
 * @param status of the response
 * @param content of the response
 */
function sendJSONresponse(res: Response, status: number, content: any) {
    res.status(status);
    res.json(content);
}


export class EthereumBlockchainUtils {

    static web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk"));
    static testAddress = "0x4b10b4479c0a62a1c1a5422b9295c765ae6fe42f";

    public static retrieveLatestTransactionsFromBlockchain(address: String, startBlockNumber: number, endBlockNumber: number) {
        if (this.web3.isConnected()) {
            // get all transactions for this address
            if (endBlockNumber === undefined) {
                endBlockNumber = this.web3.eth.blockNumber;
            }
            if (startBlockNumber === undefined) {
                startBlockNumber = endBlockNumber - 1000;
            }
            for (let i = startBlockNumber; i <= endBlockNumber; i++) {
                if (i % 10 === 0) {
                    console.log("Searching block " + i);
                }
                const block = this.web3.eth.getBlock(i, true);
                if (block !== null && block.transactions !== null) {
                    this.searchForTransactionsInBlock(address, block);
                }
            }
        }
    }

    private static searchForTransactionsInBlock(address: String, block: any) {
        block.transactions.forEach(function (transaction: any) {

            if (address === transaction.from || address === transaction.to) {
                this.printTransaction(block, transaction);
                this.storeTransaction(block, transaction);
            }
        });
    }

    private static printTransaction(block: any, transaction: any) {
        console.log(
              "  tx hash          : " + transaction.hash + "\n"
            + "   nonce           : " + transaction.nonce + "\n"
            + "   blockHash       : " + transaction.blockHash + "\n"
            + "   blockNumber     : " + transaction.blockNumber + "\n"
            + "   transactionIndex: " + transaction.transactionIndex + "\n"
            + "   from            : " + transaction.from + "\n"
            + "   to              : " + transaction.to + "\n"
            + "   value           : " + transaction.value + "\n"
            + "   time            : " + block.timestamp + " " + new Date(block.timestamp * 1000).toUTCString() + "\n"
            + "   gasPrice        : " + transaction.gasPrice + "\n"
            + "   gas             : " + transaction.gas + "\n"
            + "   input           : " + transaction.input);
    }

    private static storeTransaction(block: any, transaction: any) {
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

        // check if tx already exists
        Transaction.find({hash : transaction_data.hash}, function (err: Error, docs: any) {
            if (docs.length) {
                console.log("Transaction already exists in DB");
            } else {
                // create it if not stored yet
                Transaction.create(transaction_data, function callback(err: Error, transaction: any) {
                    if (err) {
                        console.log("Error: " + err);
                    } else {
                        console.log("Success saving: " + transaction);
                    }
                });
            }
        });
    }
}


export {
    sendJSONresponse
};