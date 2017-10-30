import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Transaction } from "../models/transaction.model";


export class TransactionController {

    public readAllTransactions(req: Request, res: Response) {
        const queryParams = TransactionController.extractQueryParameters(req);

        // build up query
        const query: any = {};
        if (queryParams.from) {
            query.from = queryParams.from;
        }
        if (queryParams.to) {
            query.to = queryParams.from;
        }

        const promise = Transaction.paginate(query, {page: queryParams.page, limit: queryParams.limit});
        promise.then( (transactions: any) => {
            sendJSONresponse(res, 200, transactions);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
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

    private static extractQueryParameters(req: Request) {
        let page = parseInt(req.query.page, 10);
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        let limit = parseInt(req.query.limit, 10);
        if (isNaN(limit)) {
            limit = 10;
        } else if (limit > 50) {
            limit = 50;
        } else if (limit < 1) {
            limit = 1;
        }

        const from = req.query.from;
        const to = req.query.to;

        return {
            to: to,
            from: from,
            page: page,
            limit: limit
        };
    }

}