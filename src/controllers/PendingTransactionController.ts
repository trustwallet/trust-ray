
import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Config } from "../common/Config";
import { Error } from "mongoose";
let Promise = require("bluebird");

export class PendingTransactionController {

    public getPendingTransactions(req: Request, res: Response) {
        const validationErrors: any = PendingTransactionController.validateQueryParameters(req);

        if (validationErrors) {
            sendJSONresponse(res, 400, {validationErrors});
            return;
        }

        const address: string = req.query.address;

        Config.web3.eth.getBlock("pending", true)
        .then((pendings: any) => {
            return new Promise.filter(pendings.transactions, function(transaction: any) {
                return (transaction.from === address || transaction.to == address) ? true : false;
            }).map(function(filteredTransactions: any) {
                return {
                    from: filteredTransactions.from,
                    to: filteredTransactions.to,
                    blockNumber: filteredTransactions.blockNumber,
                    gas: filteredTransactions.gas,
                    gasPrice: filteredTransactions.gasPrice,
                    nonce: filteredTransactions.nonce,
                    hash: filteredTransactions.hash,
                    input: filteredTransactions.input,
                }
            });
        })
        .then((pendings: any) => {
            sendJSONresponse(res, 200, { pendings });
            return;
        })
        .catch((error: Error) => {
            sendJSONresponse(res, 400, { error });
            return; 
        });
    }

    private static validateQueryParameters(req: Request) {
        req.checkQuery("address", "address needs to be alphanumeric and 42 characters long").optional().isLength({min: 42, max: 42});
        req.checkQuery("address", "address needs to be hexidecimal").optional().isAlphanumeric();
        return req.validationErrors();
    }
};