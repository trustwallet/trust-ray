import * as Bluebird from "bluebird";
import * as winston from "winston";

import { Transaction } from "../../models/TransactionModel";
import { IBlock, IExtractedTransaction, ITransaction } from "../CommonInterfaces";
import { Config } from "../Config";

export class BlockTransactionParser {
    public async parse(block): Promise<any[]> {
        const transactions = this.extractTransactions(block);
        const transactionIDs = this.getTransactionIDs(transactions);
        const receipts = await this.fetchReceiptsFromTransactionIDs(transactionIDs);
        const mergedTransactions = this.mergeTransactionsAndReceipts(transactions, receipts);
        return Promise.resolve(mergedTransactions);
    }

    public extractTransactions(block): any[] {
        return this.getRawTransactions(block).map((tx: ITransaction) => {
            return new Transaction(this.extractTransaction(block, tx));
        });
    }

    public getTransactionIDs(transactions): string[] {
        return transactions.map((tx: IExtractedTransaction) => tx._id);
    }

    public async fetchReceiptsFromTransactionIDs (transactionIDs: string[]) {
        const batchLimit = 300
        const chunk = (list, size) => list.reduce((r, v) =>
            (!r.length || r[r.length - 1].length === size ?
                r.push([v]) : r[r.length - 1].push(v)) && r
            , []);
        const chunkTransactions = chunk(transactionIDs, batchLimit)

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

            return [].concat(...receipts);

        } catch (error) {
            winston.error(`Error getting receipt from transaction `, error)
            Promise.reject(error)
        }
    }

    public mergeTransactionsAndReceipts(transactions: any[], receipts: any[]) {
        if (transactions.length !== receipts.length) {
            winston.error(`Number of transactions not equal to number of receipts.`);
        }

        // compared to old version in TransactionParser, execution time improved from 10s to 5s
        const receiptMap = new Map<string, any>(
            receipts.map(r => [r.transactionHash, r] as [string, any])
        );
        const results: any = [];

        transactions.forEach((transaction) => {
            const receipt = receiptMap.get(transaction._id);
            results.push(this.mergeTransactionWithReceipt(transaction, receipt));
        });

        return Promise.resolve(results);
    }

    public updateTransactionsDatabase(transactions: any) {
        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();

        transactions.forEach((transaction: IExtractedTransaction) =>
            bulkTransactions.find({_id: transaction._id}).upsert().replaceOne(transaction)
        );

        if (bulkTransactions.length === 0) return Promise.resolve();

        return bulkTransactions.execute().then((bulkResult: any) => {
            return Promise.resolve(transactions);
        });
    }

    // ###### private methods ######

    private getRawTransactions(block): any[] {
        return block.transactions;
    }

    private extractTransaction(block: IBlock, transaction: ITransaction) {
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

    private mergeTransactionWithReceipt(transaction: any, receipt: any) {
        const newTransaction = transaction;
        newTransaction.gasUsed = receipt.gasUsed;
        newTransaction.receipt = receipt;
        newTransaction.contract = receipt.contractAddress ? receipt.contractAddress.toLowerCase() : null
        if (receipt.status) {
            newTransaction.error = receipt.status === "0x1" ? "" : "Error";
        }
        return newTransaction;
    }
}