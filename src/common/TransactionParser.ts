
import { Transaction } from "../models/transaction.model";

export class TransactionParser {

    public parseTransactions(blocks: any) {
        // collect bulk inserts
        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
        const transactions: any = [];
        blocks.map((block: any) => {
            if (block !== null && block.transactions !== null && block.transactions.length > 0) {
                block.transactions.map((transaction: any) => {
                    const hash = String(transaction.hash);
                    const transaction_data = this.extractTransactionData(block, transaction);
                    transactions.push(new Transaction(transaction_data));
                    bulkTransactions.find({_id: hash}).upsert().replaceOne(transaction_data);
                });
            }
        });

        // execute the bulk
        if (bulkTransactions.length === 0) {
            return Promise.resolve()
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

    public parseTransactionOperations(transactions: any, contracts: any) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

}