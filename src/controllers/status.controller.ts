import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Transaction } from "../models/transaction.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";

import * as winston from "winston";
const packageJSON = require("../../package.json");

export class StatusController {

    getStatus(req: Request, res: Response) {
        Promise.all([
            Transaction.count(),
            LastParsedBlock.findOne()
        ]).then(([transactionsCount, lastParsedBlock]) => {
            sendJSONresponse(res, 200, {
                transactions: parseInt(transactionsCount).toLocaleString(),
                lastParsedBlock: lastParsedBlock.lastBlock,
                version: packageJSON.version,
            });
        }).catch((err: Error) => {
            winston.error("Failed to load initial block state: " + err);
            sendJSONresponse(res, 200, {error: err})
        });
    }
}