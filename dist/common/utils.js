"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const tx = require("ethereumjs-tx");
const transaction_model_1 = require("../models/transaction.model");
/**
 * Fills the status and JSOn data into a response object.
 * @param res response object
 * @param status of the response
 * @param content of the response
 */
function sendJSONresponse(res, status, content) {
    res.status(status);
    res.json(content);
}
exports.sendJSONresponse = sendJSONresponse;
class EthereumBlockchainUtils {
    static retrieveLatestTransactionsFromBlockchain(address, startBlockNumber, endBlockNumber) {
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
    static searchForTransactionsInBlock(address, block) {
        block.transactions.forEach(function (transaction) {
            if (address === transaction.from || address === transaction.to) {
                this.printTransaction(block, transaction);
                this.storeTransaction(block, transaction);
            }
        });
    }
    static printTransaction(block, transaction) {
        console.log("  tx hash          : " + transaction.hash + "\n"
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
    static storeTransaction(block, transaction) {
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
            returnNewDocument: true }, function (err, transaction) {
            if (err) {
                console.log("Error: " + err);
            }
            else {
                console.log("Success saving: transaction" + transaction);
            }
        });
    }
}
EthereumBlockchainUtils.web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk"));
EthereumBlockchainUtils.testAddress = "0x4b10b4479c0a62a1c1a5422b9295c765ae6fe42f";
exports.EthereumBlockchainUtils = EthereumBlockchainUtils;
//# sourceMappingURL=utils.js.map