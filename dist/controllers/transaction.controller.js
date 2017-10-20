"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const transaction_model_1 = require("../models/transaction.model");
class TransactionController {
    readAllTransactions(req, res) {
        if (req.query.fromAddress) {
            const fromAddress = req.query.fromAddress;
            transaction_model_1.Transaction.find({ from: fromAddress }, function (err, transactions) {
                TransactionController.readAllTransactionsCallback(res, err, transactions, fromAddress);
            });
        }
        else {
            transaction_model_1.Transaction.find({}, function (err, transactions) {
                TransactionController.readAllTransactionsCallback(res, err, transactions, "*");
            });
        }
    }
    readOneTransaction(req, res) {
        if (!req.params || !req.params.transactionId) {
            utils_1.sendJSONresponse(res, 404, { "message": "No transaction ID in request" });
            return;
        }
        const transactionId = req.params.transactionId;
        transaction_model_1.Transaction
            .findById(transactionId)
            .exec(function callback(err, transaction) {
            if (!transaction) {
                utils_1.sendJSONresponse(res, 404, { "message": "transaction ID not found" });
                return;
            }
            else if (err) {
                utils_1.sendJSONresponse(res, 404, err);
                return;
            }
            // success
            utils_1.sendJSONresponse(res, 200, transaction);
        });
    }
    static readAllTransactionsCallback(res, err, transactions, fromAddress) {
        if (transactions.length === 0) {
            utils_1.EthereumBlockchainUtils.retrieveLatestTransactionsFromBlockchain(fromAddress, undefined, undefined);
        }
        if (err) {
            utils_1.sendJSONresponse(res, 404, err);
        }
        else {
            utils_1.sendJSONresponse(res, 200, transactions);
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map