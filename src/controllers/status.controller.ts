import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Transaction } from "../models/transaction.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";
import { Config } from "../common/config";

import * as winston from "winston";
const packageJSON = require("../../package.json");

export class StatusController {

    getStatus(req: Request, res: Response) {
        Promise.all([
            Transaction.count(),
            LastParsedBlock.findOne(),
            Config.web3.eth.getBlockNumber(),
            Config.web3.eth.net.getId()
        ]).then(([transactionsCount, lastParsedBlock, latestBlockNumberInBC, networkId]) => {
            const latestBlockNumberInDB = lastParsedBlock.lastBlock
            const blocksToSync = latestBlockNumberInBC - latestBlockNumberInDB
            sendJSONresponse(res, 200, {
                transactions: parseInt(transactionsCount).toLocaleString(),
                latestBlockNumberInBC,
                latestBlockNumberInDB,
                blocksToSync,
                version: packageJSON.version,
                config: {
                    rpc_server: process.env.RPC_SERVER,
                    network_id: networkId
                }
            });
        }).catch((err: Error) => {
            winston.error("Failed to load initial block state: " + err);
            sendJSONresponse(res, 200, {error: err})
        });
    }
}