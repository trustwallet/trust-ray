"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const transaction_model_1 = require("../models/transaction.model");
class TransactionController {
    readAllTransactions(req, res) {
        if (req.query.fromAddress) {
            transaction_model_1.Transaction.find({ from: req.query.fromAddress }).exec().then((transactions) => {
                utils_1.sendJSONresponse(res, 200, transactions);
            }).catch((err) => {
                utils_1.sendJSONresponse(res, 404, err);
            });
        }
        else {
            transaction_model_1.Transaction.find({}).exec().then((transactions) => {
                utils_1.sendJSONresponse(res, 200, transactions);
            }).catch((err) => {
                utils_1.sendJSONresponse(res, 404, err);
            });
        }
    }
    readOneTransaction(req, res) {
        if (!req.params || !req.params.transactionId) {
            utils_1.sendJSONresponse(res, 404, { "message": "No transaction ID in request" });
            return;
        }
        transaction_model_1.Transaction.findById(req.params.transactionId).exec().then((transaction) => {
            if (!transaction) {
                utils_1.sendJSONresponse(res, 404, { "message": "transaction ID not found" });
                return;
            }
            utils_1.sendJSONresponse(res, 200, transaction);
        }).catch((err) => {
            utils_1.sendJSONresponse(res, 404, err);
        });
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map