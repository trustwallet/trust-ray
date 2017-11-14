import { Transaction } from "../models/TransactionModel";
import { TokenParser } from "./TokenParser";
import { TransactionParser } from "./TransactionParser";


export class LegacyParser {

    public reparseChain() {


        Transaction.find({
            $or: [
                {addresses:  { $exists: false }},
                {addresses:  { $eq: [] }}
            ],
        }).limit(500).exec().then((transactions: any) => {
            if (transactions) {
                transactions.map((transaction: any) => {
                   transaction.addresses = [transaction.from, transaction.to];
                   transaction.save().catch((err: Error) => {
                       console.log(`Error while saving transaction ${transaction._id} with error ${err}`);
                   });
                });
                return new TokenParser().parseERC20Contracts(transactions).then(([transactions, contracts]: any) => {
                    new TransactionParser().parseTransactionOperations(transactions, contracts);
                });
            } else {
                Promise.resolve();
            }
        }).then(() => {
            console.log("Parsed 500 transactions");
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