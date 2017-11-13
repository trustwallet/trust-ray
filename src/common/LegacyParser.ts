import { Transaction } from "../models/TransactionModel";
import { TokenParser } from "./TokenParser";
import { TransactionParser } from "./TransactionParser";


export class LegacyParser {

    public reparseChain() {
        Transaction.find({
            $or: [
                {operations: { $exists: false }},
                {operations: { $eq: [] }},
                {addresses:  { $exists: false }},
                {addresses:  { $eq: [] }}
            ],
        }).limit(100).exec().then((transactions: any) => {
            if (transactions) {
                transactions.map((transaction: any) => {
                   transaction.address = [transaction.from, transaction.to];
                });
                return new TokenParser().parseERC20Contracts(transactions).then(([transactions, contracts]: any) => {
                    new TransactionParser().parseTransactionOperations(transactions, contracts);
                });
            } else {
                Promise.resolve();
            }
        }).then(() => {
            this.scheduleToRestart(1000);
        });
    }

    private scheduleToRestart(delay: number) {
        this.delay(delay).then(() => {
            this.reparseChain();
        });
    }

    private delay(t: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, t);
        });
    }

}