
import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Config } from "../common/Config";
let Promise = require("bluebird");

export class PendingTransactionController {

    getPendingTransactions (req: Request, res: Response) {
        interface Transaction {
            blockNumber: number,
            from: string,
            gas: number,
            gasPrice: number,
            hash: string,
            input: string,
            nonce: number,
            to: string,
        }

        interface Pendings {
            transactions: Transaction[],
        }

        const validationErrors: any = PendingTransactionController.validateQueryParameters(req);
        
        if (validationErrors) {
            sendJSONresponse(res, 400, {validationErrors});
            return;
        }

        const address: string = req.query.address;

        Config.web3.eth.getBlock("pending", true).then((pendings: Pendings): void => {
            return new Promise.filter(pendings.transactions, function(transaction: Transaction): boolean {
                return transaction.from === address || transaction.to == address;
            }).map((transaction: Transaction) => {
                return {
                    blockNumber: transaction.blockNumber,
                    from: transaction.from,
                    gas: transaction.gas,
                    gasPrice: transaction.gasPrice,
                    hash: transaction.hash,
                    input: transaction.input,
                    nonce: transaction.nonce,
                    to: transaction.to,
                }
            });
        })
        .then((pendings: Transaction[]): void => {
            sendJSONresponse(res, 200, { pendings });
            return;
        })
        .catch((error: Error): void => {
            sendJSONresponse(res, 400, { error });
            return; 
        });
    }

    static validateQueryParameters(req: Request) {
        req.checkQuery("address", "address needs to be alphanumeric and 42 characters long").optional().isLength({min: 42, max: 42});
        req.checkQuery("address", "address needs to be hexidecimal").optional().isAlphanumeric();
        return req.validationErrors();
    }
};