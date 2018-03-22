import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Transaction } from "../models/TransactionModel";
import { ERC20Contract } from "../models/Erc20ContractModel";
import * as xss from "xss-filters";
import { WalletsController } from "./WalletsController";

export class TransactionController {

    private defaultLimit: number = 25;
    private maxLimit: number = 50;

    public readAllTransactions = (req: Request, res: Response) => {
        const Wallets = new WalletsController()
        // validate query input
        const validationErrors: any = TransactionController.validateQueryParameters(req);
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        // extract query parameters
        const queryParams = this.extractQueryParameters(req);
        // build up query
        const query: any = {};
        if (queryParams.address !== undefined) {
            const address: string = queryParams.address.toLowerCase();
            query.addresses = { "$in": [address] };
            Wallets.register(address);
        }
        query.blockNumber = { "$gte": queryParams.startBlock, "$lte": queryParams.endBlock};
        const address: string = queryParams.address.toLowerCase();

        if (queryParams.contract) {
            const contract: string = queryParams.contract.toLowerCase();
            query.to = {$eq: contract}
        }


        Transaction.paginate(query, {
            page: queryParams.page,
            limit: queryParams.limit,
            sort: {timeStamp: -1},
            select: "-addresses",
            populate: {
                path: "operations",
                match: {$or: [
                    {to: {$eq: address}},
                    {from: {$eq: address}}
                ]},
                populate: {
                    path: "contract",
                    model: "ERC20Contract"
                }
            }
        }).then((transactions: any) => {
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

        // validate transaction ID
        req.checkParams("transactionId", "Transaction ID must be alphanumeric").isAlphanumeric();
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        const transactionId = xss.inHTMLData(req.params.transactionId);

        Transaction.findOne({
            _id: transactionId
        }).populate({
            path: "operations",
            populate: {
                path: "contract",
                model: "ERC20Contract"
            }
        }).exec().then((transaction: any) => {
            if (!transaction) {
                sendJSONresponse(res, 404, {"message": "transaction ID not found"});
                return;
            }
            sendJSONresponse(res, 200, transaction);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    private static validateQueryParameters(req: Request) {
        req.checkQuery("page", "Page needs to be a number").optional().isNumeric();
        req.checkQuery("startBlock", "startBlock needs to be a number").optional().isNumeric();
        req.checkQuery("endBlock", "endBlock needs to be a number").optional().isNumeric();
        req.checkQuery("limit", "limit needs to be a number").optional().isNumeric();
        req.checkQuery("address", "address needs to be alphanumeric and have a length 42").isAlphanumeric().isLength({min: 42, max: 42});
        req.checkQuery("contract", "contract symbol needs to be alphanumeric and have a length 42").optional().isAlphanumeric().isLength({min: 42, max: 42});

        return req.validationErrors();
    }

    private extractQueryParameters(req: Request) {
        // page parameter
        let page = parseInt(xss.inHTMLData(req.query.page));
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        // limit parameter
        let limit = parseInt(xss.inHTMLData(req.query.limit));
        if (isNaN(limit)) {
            limit = this.defaultLimit;
        } else if (limit > this.maxLimit) {
            limit = this.maxLimit;
        } else if (limit < 1) {
            limit = 1;
        }

        // address parameter
        const address = xss.inHTMLData(req.query.address).toLowerCase();

        // start block parameter
        let startBlock = parseInt(xss.inHTMLData(req.query.startBlock));
        if (isNaN(startBlock) || startBlock < 1) {
            startBlock = 1;
        }

        // end block parameter
        let endBlock = parseInt(xss.inHTMLData(req.query.endBlock));
        if (isNaN(endBlock) || endBlock < 1 || endBlock < startBlock) {
            endBlock = 9999999999;
        }

        const contract = req.query.contract;

        return {
            address: address,
            startBlock: startBlock,
            endBlock: endBlock,
            page: page,
            limit,
            contract
        };
    }

}
