import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Transaction } from "../models/transaction.model";
const packageJSON = require("../../package.json");

export class StatusController {

    public getStatus(req: Request, res: Response) {
        StatusController.getTransactionsCount()
            .then((count: any) => {
                sendJSONresponse(res, 200, {
                    transactions: count,
                    version: packageJSON.version,
                });
            })
            .catch((error: Error) => {
                console.log("Erorr", error);
            });
    }

    public static async getTransactionsCount() {
         return await Transaction.count({}).exec().then((count: any) => {
             return parseInt(count).toLocaleString();
         });
    }
}