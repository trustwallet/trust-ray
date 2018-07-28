import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
import { TransactionOperation } from "../models/TransactionOperationModel";
import { removeScientificNotationFromNumbString } from "./Utils";
import { Config } from "./Config";
import * as Bluebird from "bluebird";
import { IDecodedLog, IContract, ITransaction, IBlock, IExtractedTransaction, ISavedTransaction } from "./CommonInterfaces";
const erc20abi = require("./contracts/Erc20Abi");
const erc20ABIDecoder = require("abi-decoder");
erc20ABIDecoder.addABI(erc20abi);

export class TransactionParser {
    private OperationTypes = {
        Transfer: "Transfer",
    }

    public parseTransactions(blocks: any) {
        if (blocks.length === 0) return Promise.resolve();

        const extractedTransactions = blocks.flatMap((block: any) => {
            return block.transactions.map((tx: ITransaction) => {
                return new Transaction(this.extractTransactionData(block, tx));
            });
        });
        const txIDs = extractedTransactions.map((tx: IExtractedTransaction) => tx._id);

        return this.fetchTransactionReceipts(txIDs).then((receipts: any) => {
            return this.mergeTransactionsAndReceipts(extractedTransactions, receipts);
        }).then((transactions: any) => {
            const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();

            transactions.forEach((transaction: IExtractedTransaction) =>
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
        newTransaction.contract = receipt.contractAddress ? receipt.contractAddress.toLowerCase() : null
        newTransaction.error = receipt.status == ("0x1" || "1" || 1 || null) ? "" : "Error"
        return newTransaction;
    }

    extractTransactionData(block: IBlock, transaction: ITransaction) {
        const from = String(transaction.from).toLowerCase();
        const to: string = transaction.to === null ? "" : String(transaction.to).toLowerCase();
        const addresses: string[] = to ? [from, to] : [from];

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
            addresses
        };
    }

    // ========================== OPERATION PARSING ========================== //

    public parseTransactionOperations(transactions: ISavedTransaction[], contracts: IContract[]) {
        if (!transactions || !contracts) return Promise.resolve();

        return Bluebird.map(transactions, (transaction) => {
            const decodedLogs = erc20ABIDecoder.decodeLogs(transaction.receipt.logs).filter((decodedLog?: IDecodedLog) => decodedLog);

            if (decodedLogs.length > 0) {
                return Bluebird.mapSeries(decodedLogs, (decodedLog: IDecodedLog, index: number) => {
                    if (decodedLog.name === this.OperationTypes.Transfer) {
                        const contract = contracts.find((contract: IContract) => contract.address === decodedLog.address.toLowerCase());
                        if (contract) {
                            const transfer = this.parseEventLog(decodedLog);
                            return this.findOrCreateTransactionOperation(transaction._id, index, transfer.from, transfer.to, transfer.value, contract._id);
                        }
                    }
                })

            }
        }).catch((err: Error) => {
            winston.error(`Could not parse transaction operations with error: ${err}`);
        });
    }

    private createOperationObject(transactionId: string, index: number, from: string, to: string, value: string, erc20ContractId?: any) {
        return {
            transactionId: this.getIndexedOperation(transactionId, index),
            type: "token_transfer",
            from: from.toLocaleLowerCase(),
            to,
            value,
            contract: erc20ContractId
        };
    }

    private getIndexedOperation(transactionId: string, index: number): string {
        return `${transactionId}-${index}`.toLowerCase();
    }

    private parseEventLog(eventLog: any): {from: string, to: string, value: string} {
        return {
            from: eventLog.events[0].value,
            to: eventLog.events[1].value,
            value: removeScientificNotationFromNumbString(eventLog.events[2].value),
        }
    }

    private findOrCreateTransactionOperation(transactionId: string, index: number, from: string, to: string, value: string, erc20ContractId?: any): Promise<any> {

        const operation = this.createOperationObject(transactionId, index, from, to, value, erc20ContractId);
        const indexedOperation = this.getIndexedOperation(transactionId, index);

        return TransactionOperation.findOneAndUpdate({transactionId: indexedOperation}, operation, {upsert: true, new: true})
            .then((operation: any) => {
                return Transaction.findOneAndUpdate({_id: transactionId}, {$push: {operations: operation._id, addresses: {$each: [operation.to]}}})
            .catch((error: Error) => {
                winston.error(`Could not update operation and address to transactionID ${transactionId} with error: ${error}`);
            })
        }).catch((error: Error) => {
            winston.error(`Could not save transaction operation with error: ${error}`);
        })
    }

    private async fetchTransactionReceipts (transactions: any) {
        const batchLimit = 300
        const chunk = (list, size) => list.reduce((r, v) =>
            (!r.length || r[r.length - 1].length === size ?
            r.push([v]) : r[r.length - 1].push(v)) && r
        , []);
        const chunkTransactions = chunk(transactions, batchLimit)

        try {
            const receipts = await Bluebird.map(chunkTransactions, (chunk: any) => {
                return new Promise((resolve, reject) => {
                  let completed = false;
                  const chunkReceipts = [];
                  const callback = (err: Error, receipt: any) => {
                    if (completed) return;
                    if (err || !receipt) {
                        completed = true;
                        reject(err);
                    }

                    chunkReceipts.push(err ? null : receipt);
                    if (chunkReceipts.length >= chunk.length) {
                        completed = true;
                        resolve(chunkReceipts);
                    }
                  };

                  if (chunk.length > 0) {
                    const batch = new Config.web3.BatchRequest();
                    chunk.forEach((tx: any) => {
                        batch.add(Config.web3.eth.getTransactionReceipt.request(tx, callback));
                    });
                    batch.execute();
                  } else {
                    resolve(chunkReceipts);
                  }
                });
            })

            return [].concat(...receipts)
        } catch (error) {
            winston.error(`Error getting transtaction receipt `, error)
            Promise.reject(error)
        }
    }

    static getTransactions(blockNumber: number): Promise<any[]> {
        return Transaction.find({blockNumber: {$eq: blockNumber}})
            .populate({
                path: "operations",
                populate: {
                    path: "contract",
                    model: "ERC20Contract"
                }
            });
    }

    static getTransactionsForAddress(address: string): Promise<any[]> {
        return Transaction.find({addresses: { "$in": [address] }})
            .populate({
                path: "operations",
                populate: {
                    path: "contract",
                    model: "ERC20Contract"
                }
            });
    }
}
