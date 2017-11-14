import { Transaction } from "../models/TransactionModel";
import { TokenParser } from "./TokenParser";
import { TransactionParser } from "./TransactionParser";
import * as winston from "winston";


export class LegacyParser {

    private parallelReparse = 200;

    public reparseChain() {


        Transaction.find({
            $or: [
                {addresses:  { $exists: false }},
                {addresses:  { $eq: [] }},
                {timeStamp:  { $gt: "1510567093" }}
            ],
        }).limit(this.parallelReparse).exec().then((transactions: any) => {
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
            winston.info(`Parsed ${this.parallelReparse} transactions`);
            this.scheduleToRestart(1000);
        }).catch((err: Error) => {
            winston.info(`Error while reparsing: ${err}`);
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