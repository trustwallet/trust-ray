import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Transaction } from "../models/transaction.model";


export class TransactionController {

    public readAllTransactions(req: Request, res: Response) {
        if (req.query.fromAddress) {
            Transaction.find({from: req.query.fromAddress}).exec().then((transactions: any) => {
                sendJSONresponse(res, 200, transactions);
            }).catch((err: Error) => {
                sendJSONresponse(res, 404, err);
            });
        } else {
            Transaction.find({}).exec().then((transactions: any) => {
                sendJSONresponse(res, 200, transactions);
            }).catch((err: Error) => {
                sendJSONresponse(res, 404, err);
            });
        }
    }

    public readOneTransaction(req: Request, res: Response) {
        if (!req.params || !req.params.transactionId) {
            sendJSONresponse(res, 404, { "message": "No transaction ID in request" });
            return;
        }
        Transaction.findById(req.params.transactionId).exec().then((transaction: any) => {
            if (!transaction) {
                sendJSONresponse(res, 404, {"message": "transaction ID not found"});
                return;
            }
            sendJSONresponse(res, 200, transaction);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

}