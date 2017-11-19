import { Transaction } from "../models/TransactionModel";
import { TokenParser } from "./TokenParser";
import { TransactionParser } from "./TransactionParser";
import * as winston from "winston";
import { setDelay } from "./Utils";


/**
 * This class will be used re-parse the already stored
 * models in case new fields or similar need to be added/removed.
 */
export class LegacyParser {

    private parallelReparse = 1000;
    private tokenParser = new TokenParser();
    private transactionParser = new TransactionParser();


    /**
     * Re-parses currently transactions that are missing
     * the field "addresses" which is however used for
     * filtering transactions by the endoint controller.
     * Necessary, since the field was added after the full
     * parse of the blockchain.
     */
    public reparseChain() {

        // find all transactions that have
        // addresses field missing or empty
        Transaction.find({
            $or: [
                       {addresses:  { $exists: false }},
                       {addresses:  { $eq: [] }},
            ],
        }).limit(this.parallelReparse).exec().then((transactions: any) => {
            if (transactions && transactions.length > 0) {

                // re-parse the transaction and thereby parse
                // operation, addresses field and erc20 contracts
                transactions.map((transaction: any) => {
                   transaction.addresses = [transaction.from, transaction.to];
                   transaction.save().catch((err: Error) => {
                       console.log(`Error while saving transaction ${transaction._id} with error ${err}`);
                   });
                });
                return this.tokenParser.parseERC20Contracts(transactions).then(([transactions, contracts]: any) => {
                    this.transactionParser.parseTransactionOperations(transactions, contracts);
                });
            } else {
                // set the finish flag when no
                // transactions are returned, thus
                // all have been re-parsed
                return Promise.resolve("Finished");
            }
        }).then((result: any) => {
            if (result !== "Finished") {
                // wait for 1 seconds and then restart the process
                winston.info(`Reparsed ${this.parallelReparse} transactions`);
                setDelay(1000).then(() => {
                    this.reparseChain()
                });
            } else {
                winston.info(`Finished reparse`);
            }
        }).catch((err: Error) => {
            winston.info(`Error while reparsing: ${err}`);
        });
    }

}
