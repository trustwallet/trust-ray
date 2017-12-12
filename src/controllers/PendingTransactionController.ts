
import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Config } from "../common/Config";
let Promise = require("bluebird");

export class PendingTransactionController {

    public getPendingTransactions = (req: Request, res: Response) => {
        const validationErrors: any = this.validateQueryParameters(req);
        
        if (validationErrors) {
            sendJSONresponse(res, 400, {validationErrors});
            return;
        }

        const address: string = req.query.address;

        Config.web3.eth.getBlock("pending", true).then((pendings: any) => {
            return new Promise.filter(pendings.transactions, function(transaction: any) {
                return (transaction.from === address || transaction.to == address) ? true : false;
            }).map(function(transaction: any) {
                return {
                    from: transaction.from,
                    to: transaction.to,
                    blockNumber: transaction.blockNumber,
                    gas: transaction.gas,
                    gasPrice: transaction.gasPrice,
                    nonce: transaction.nonce,
                    hash: transaction.hash,
                    input: transaction.input,
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

    private validateQueryParameters = (req: Request) => {
        req.checkQuery("address", "address needs to be alphanumeric and 42 characters long").optional().isLength({min: 42, max: 42});
        req.checkQuery("address", "address needs to be hexidecimal").optional().isAlphanumeric();
        return req.validationErrors();
    }
};