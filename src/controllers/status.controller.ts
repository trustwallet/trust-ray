import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Transaction } from "../models/transaction.model";
import { TransactionOperation } from "../models/transactionOperation.model";
import { ERC20Contract } from "../models/erc20Contract.model";
import { LastParsedBlock } from "../models/lastParsedBlock.model";
import { Config } from "../common/config";

import * as winston from "winston";
const packageJSON = require("../../package.json");

export class StatusController {

    getStatus(req: Request, res: Response) {
        Promise.all([
            Transaction.count(),
            TransactionOperation.count(),
            ERC20Contract.count(),
            LastParsedBlock.findOne(),
            Config.web3.eth.getBlockNumber(),
            Config.web3.eth.net.getId()
        ]).then(([transactionsCount, operationsCount, erc20contractsCount, lastParsedBlock, latestBlockNumberInBC, networkId]) => {
            const latestBlockNumberInDB = lastParsedBlock.lastBlock
            const blocksToSync = latestBlockNumberInBC - latestBlockNumberInDB
            sendJSONresponse(res, 200, {
                database: {
                    transactions: parseInt(transactionsCount).toLocaleString(),
                    transaction_operations: parseInt(operationsCount).toLocaleString(),
                    erc20contracts: parseInt(erc20contractsCount).toLocaleString(),
                },
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