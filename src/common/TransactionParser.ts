import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
import { TransactionOperation } from "../models/TransactionOperationModel";
import { removeScientificNotationFromNumbString } from "./Utils";
import { Config } from "./Config";

const erc20abi = require("./contracts/Erc20Abi");
const erc20ABIDecoder = require("abi-decoder");
erc20ABIDecoder.addABI(erc20abi);

export class TransactionParser {

    public parseTransactions(blocks: any) {
        if (blocks.length === 0) return Promise.resolve();

        const extractedTransactions = blocks.flatMap((block: any) => {
            return block.transactions.map((tx: any) => {
                return new Transaction(this.extractTransactionData(block, tx));
            });
        });
        const txIDs = extractedTransactions.map((tx: any) => tx._id);

        return this.fetchTransactionReceipts(txIDs).then((receipts: any) => {
            return this.mergeTransactionsAndReceipts(extractedTransactions, receipts);
        }).then((transactions: any) => {
            const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();

            transactions.forEach((transaction: any) =>
                bulkTransactions.find({_id: transaction._id}).upsert().replaceOne(transaction)
            );

            if (bulkTransactions.length === 0) return Promise.resolve();

            return bulkTransactions.execute().then((bulkResult: any) => {
                return Promise.resolve(transactions);
            });
        });
    }

    private mergeTransactionsAndReceipts(transactions: any[], receipts: any[]) {
        // TODO: Big(n square). Improve it
        const results: any = []
        transactions.forEach((transaction) => {
            receipts.forEach((receipt: any) => {
                if (transaction._id == receipt.transactionHash) {
                    results.push(this.mergeTransactionWithReceipt(transaction, receipt))
                }
            })
        });
        if (transactions.length !== receipts.length) {
            winston.error(`Number of transactions not equal to number of receipts.`);
        }
        return Promise.resolve(results);
    }

    private mergeTransactionWithReceipt(transaction: any, receipt: any) {
        const newTransaction = transaction;
        newTransaction.gasUsed = receipt.gasUsed;
        newTransaction.receipt = receipt;
        if (receipt.status) {
            newTransaction.error = receipt.status === "0x1" ? "" : "Error";
        }
        return newTransaction;
    }

    private extractTransactionData(block: any, transaction: any) {
        const from = String(transaction.from).toLowerCase();
        const to = String(transaction.to).toLowerCase();

        return {
            _id: String(transaction.hash),
            blockNumber: Number(transaction.blockNumber),
            timeStamp: String(block.timestamp),
            nonce: Number(transaction.nonce),
            from,
            to,
            value: String(transaction.value),
            gas: String(transaction.gas),
            gasPrice: String(transaction.gasPrice),
            gasUsed: String(0),
            input: String(transaction.input),
            addresses: [from, to]
        };
    }

    // ========================== OPERATION PARSING ========================== //

    public parseTransactionOperations(transactions: any[], contracts: any[]) {
        if (!transactions || !contracts) return Promise.resolve();

        const operationPromises: any = [];

        transactions.map((transaction: any) => {
            const contract = contracts.find((c: any) => c.address === transaction.to);
            const decodedLogs = erc20ABIDecoder.decodeLogs(transaction.receipt.logs);
                // Covers where contract https://etherscan.io/tx/0x83388873b5a6d2d462e1f61e09dfcc6df779e2da46c8a1727f76e0e68b4c5ecf
                if (contract) {
                    if (decodedLogs.length > 0) {
                        console.log("decodedLogs", decodedLogs)
                        decodedLogs.forEach((eventLog: {address: string, events: any[], name: string}) => {
                            if (this.isLogValid(eventLog)) {
                                const transfer = this.parseEventLog(eventLog);
                                const p = this.findOrCreateTransactionOperation(transaction._id, transfer.from, transfer.to, transfer.value, contract._id);
                                operationPromises.push(p);
                            }
                        })
                    }
                }
                // If no contract and operaions just add operations https://etherscan.io/tx/0x0696523adeb7fdcd1ef21c5fab30a00f8fbd6935a7fd1031f4635a949b3e5de2
                if (!contract && decodedLogs.length > 1) {
                        decodedLogs.forEach((decodedLog: {name: string, events: any[], address: string}) => {
                            if (this.isLogValid(decodedLog)) {
                                const transfer = this.parseEventLog(decodedLog);
                                const p = this.findOrCreateTransactionOperation(transaction._id, transfer.from, transfer.to, transfer.value);
                                operationPromises.push(p);
                            }
                        });
                }
        });

        return Promise.all(operationPromises).catch((err: Error) => {
            winston.error(`Could not parse transaction operations with error: ${err}`);
        });
    }

    private createOperationObject(transactionId: any, transfer: any, erc20ContractId?: any) {
        return {
            transactionId: transactionId.toLowerCase(),
            type: "token_transfer",
            from: transfer.from,
            to: transfer.to,
            value: transfer.value,
            contract: erc20ContractId
        };
    }

    private isLogValid(log: {name: string, events: any[]}) {
        return ["trasfer", "mint", "Transfer"].indexOf(log.name) > -1 ? true : false;
    }

    private parseEventLog(eventLog: any): {from: string, to: string, value: string} {
        return {
            from: eventLog.events[0].value,
            to: eventLog.events[1].value,
            value: removeScientificNotationFromNumbString(eventLog.events[2].value),
        }
    }

    private findOrCreateTransactionOperation(transactionId: string, from: string, to: string, value: string, erc20ContractId?: any): Promise<any> {
        const operation = {
            transactionId: transactionId,
            type: "token_transfer",
            from: from.toLocaleLowerCase(),
            to,
            value,
            contract: erc20ContractId,
        };
        const trx = `${transactionId}_${from}`

        return TransactionOperation.findOneAndUpdate({transactionId: trx}, operation, {upsert: true, new: true})
            .then((operation: any) => {
                return Promise.resolve(Transaction.findOneAndUpdate({_id: operation.transactionId}, {$push: {operations: operation._id}, address: [operation.from, operation.to]}))
            .catch((error: Error) => {
                winston.error(`Could not update operation and address to transactionID ${transactionId} with error: ${error}`);
            })
        }).catch((error: Error) => {
            winston.error(`Could not save transaction operation with error: ${error}`);
        })
    }

    // https://gist.github.com/jdkanani/e76baa731a2b0cb6bbff26d085476722
    private fetchTransactionReceipts (transactions: any): Promise<any> {
        return new Promise((resolve, reject) => {
          const result: any = [];
          let completed = false;
          const callback = (err: Error, receipt: any) => {
            if (completed) return;
            if (err || !receipt) {
                completed = true;
                return reject(err);
            }
            result.push(err ? null : receipt);
            if (result.length >= transactions.length) {
                completed = true;
                resolve(result);
            }
          };

          if (transactions.length > 0) {
            const batch = new Config.web3.BatchRequest();
            transactions.forEach((tx: any) => {
                batch.add(Config.web3.eth.getTransactionReceipt.request(tx, callback));
            });
            batch.execute();
          } else {
            resolve(result);
          }
        });
    }
}