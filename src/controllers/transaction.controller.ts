import { Request, Response } from "express";
import { sendJSONresponse, EthereumBlockchainUtils } from "../common/utils";
import { Transaction } from "../models/transaction.model";


export class TransactionController {

    public readAllTransactions(req: Request, res: Response) {
        if (req.query.fromAddress) {
            const fromAddress = req.query.fromAddress;
            Transaction.find({from: fromAddress}, function(err: Error, transactions: any) {
                TransactionController.readAllTransactionsCallback(res, err, transactions, fromAddress);
            });
        } else {
            Transaction.find({}, function(err: Error, transactions: any) {
                TransactionController.readAllTransactionsCallback(res, err, transactions, "*");
            });
        }
    }

    public readOneTransaction(req: Request, res: Response) {
        if (!req.params || !req.params.transactionId) {
            sendJSONresponse(res, 404, { "message": "No transaction ID in request" });
            return;
        }

        const transactionId = req.params.transactionId;
        Transaction
            .findById(transactionId)
            .exec(function callback(err: Error, transaction: any) {
                if (!transaction) {
                    sendJSONresponse(res, 404, {"message": "transaction ID not found"});
                    return;
                } else if (err) {
                    sendJSONresponse(res, 404, err);
                    return;
                }
                // success
                sendJSONresponse(res, 200, transaction);
        });
    }

    private static readAllTransactionsCallback(res: Response, err: Error, transactions: any, fromAddress: String) {
        if (transactions.length === 0) {
            EthereumBlockchainUtils.retrieveLatestTransactionsFromBlockchain(fromAddress, undefined, undefined);
        }
        if (err) {
            sendJSONresponse(res, 404, err);
        } else {
            sendJSONresponse(res, 200, transactions);
        }
    }

}