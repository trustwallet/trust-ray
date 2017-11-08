import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Transaction } from "../models/transaction.model";


export class TransactionController {

    public readAllTransactions(req: Request, res: Response) {
        const queryParams = TransactionController.extractQueryParameters(req);

        // build up query
        const query: any = {};
        if (queryParams.address) {
            const address = queryParams.address.toLowerCase();
            query.$or = [{from: address}, {to: address}];
        }

        const promise = Transaction.paginate(query, {page: queryParams.page, limit: queryParams.limit, sort: {timeStamp: -1}});
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
        Transaction.findId(req.params.transactionId).exec().then((transaction: any) => {
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
        let page = parseInt(req.query.page, 50);
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        let limit = parseInt(req.query.limit, 50);
        if (isNaN(limit)) {
            limit = 50;
        } else if (limit > 500) {
            limit = 500;
        } else if (limit < 1) {
            limit = 1;
        }

        const address = req.query.address;

        return {
            address: address,
            page: page,
            limit: limit
        };
    }

}