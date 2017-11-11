import * as winston from "winston";

import { Transaction } from "../models/transaction.model";
import { TransactionOperation } from "../models/transactionOperation.model";
import { removeScientificNotationFromNumbString } from "./utils";

const erc20abi = require("./erc20abi");
const erc20ABIDecoder = require("abi-decoder");
erc20ABIDecoder.addABI(erc20abi);


export class TransactionParser {

    // ========================== TRANSACTION PARSING ========================== //

    public parseTransactions(blocks: any) {
        // collect bulk inserts
        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
        const transactions: any = [];
        blocks.map((block: any) => {
                block.transactions.map((transaction: any) => {
                    const hash = String(transaction.hash);
                    const transaction_data = this.extractTransactionData(block, transaction);
                    transactions.push(new Transaction(transaction_data));
                    bulkTransactions.find({_id: hash}).upsert().replaceOne(transaction_data);
                });
        });

        // execute the bulk
        if (bulkTransactions.length === 0) {
            return Promise.resolve();
        }
        return bulkTransactions.execute().then((bulkResult: any) => {
            return Promise.resolve(transactions);
        });
    }

    private extractTransactionData(block: any, transaction: any) {
        const hash = String(transaction.hash);
        const from = String(transaction.from).toLowerCase();
        const to = String(transaction.to).toLowerCase();
        return {
            _id: hash,
            blockNumber: Number(transaction.blockNumber),
            timeStamp: String(block.timestamp),
            nonce: Number(transaction.nonce),
            from: from,
            to: to,
            value: String(transaction.value),
            gas: String(transaction.gas),
            gasPrice: String(transaction.gasPrice),
            input: String(transaction.input),
            gasUsed: String(block.gasUsed),
            addresses: [from, to]
        };
    }

    // ========================== OPERATION PARSING ========================== //

    public parseTransactionOperations(transactions: any, contracts: any) {
        const operationPromises: any = [];
        transactions.map((transaction: any) => {
            // find contract for this transaction
            const contract = contracts.find((c: any) => c.address === transaction.to);

            if (contract) {
                const decodedInput = erc20ABIDecoder.decodeMethod(transaction.input);
                if (decodedInput && decodedInput.name === "transfer" && Array.isArray(decodedInput.params) && decodedInput.params.length == 2) {
                    const p = this.findOrCreateTransactionOperation(transaction._id, transaction.from, decodedInput, contract._id);
                    operationPromises.push(p);
                }
            }
        });

        return Promise.all(operationPromises).catch((err: Error) => {
            winston.error(`Could not parse transaction operations with error: ${err}`);
        });
    }

    private findOrCreateTransactionOperation(transactionId: any, transactionFrom: any, decodedInput: any, erc20ContractId: any): Promise<void> {
        const from = transactionFrom.toLowerCase();
        const to = decodedInput.params[0].value.toLowerCase();
        const value = removeScientificNotationFromNumbString(decodedInput.params[1].value);

        const data = {
            transactionId: transactionId,
            type: "token_transfer",
            from: from,
            to: to,
            value: value,
            contract: erc20ContractId
        };
        return TransactionOperation.findOneAndUpdate({transactionId: transactionId}, data, {upsert: true, new: true}).then((operation: any) => {
            return Transaction.findOneAndUpdate({_id: transactionId}, {
                operations: [operation._id],
                addresses: [from, to]
            }).catch((err: Error) => {
                winston.error(`Could not add operation to transaction with ID ${transactionId} with error: ${err}`);
            });
        }).catch((err: Error) => {
            winston.error(`Could not save transaction operation with error: ${err}`);
        });
    }

}