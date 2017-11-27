/*************************************************************
 * REPARSING HISTORY:
 *
 * - reparsed transactions with missing "addresses" field,
 *   => finished on November 19th 2017
 *
 * - reparsed transactions with the success flag added,
 *   remove it and replace with error message
 *   => not yet finished
 *
 *************************************************************/


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

    private parallelReparse = 750;
    private tokenParser = new TokenParser();
    private transactionParser = new TransactionParser();


    /**
     * Re-parses transactions that have the success flag,
     * remove it and add error message instead.
     */
    public reparseChain() {
        Transaction.find({success: {$exists: true}}).limit(this.parallelReparse).exec().then((transactions: any) => {
            transactions.map((transaction: any) => {
                // add error message and remove success flag
                transaction.error = transaction.success ? "" : "Error";
                transaction.success = undefined;
                transaction.save().catch((err: Error) => {
                    console.log(`Error while reparsing and saving transaction ${transaction._id} with error ${err}`);
                });
            });
        }).catch((err: Error) => {
            winston.info(`Error while reparsing: ${err}`);
        });
    }


    /**
     * Re-parses transactions that are missing
     * the field "addresses" which is however used for
     * filtering transactions by the endoint controller.
     * Necessary, since the field was added after the full
     * parse of the blockchain.
     *
     * Finished on November 19th 2017
     */
    public reparseAddresses() {

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
                    this.reparseAddresses()
                });
            } else {
                winston.info(`Finished reparse`);
            }
        }).catch((err: Error) => {
            winston.info(`Error while reparsing: ${err}`);
        });
    }

}
