import { Transaction } from "../../models/TransactionModel";
import { IBlock, ITransaction } from "../CommonInterfaces";

export class BlockTransactionParser {
    public extractTransactions(block): any[] {
        return this.getRawTransactions(block).map((tx: ITransaction) => {
            return new Transaction(this.extractTransaction(block, tx));
        });
    }

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
}