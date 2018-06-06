import * as winston from "winston";
import { TransactionParser } from "../TransactionParser";
import { Config } from "../Config";
const config = require("config");

export class ERC721Parser {
    /*
    public parse(block) {
        const transactions = this.parseTransactionsInBlock(block);
        const erc721Contracts = this.parseERC721ContractsFromTransactions(transactions);
        this.updateDatabase(transactions, erc721Contracts);
    }

    public parseTransactionsInBlock(block) {
        const transactions = this.extractTransactionsFromBlock(block);
        const receipts = this.fetchReceiptsFromTransactions(transactions);
        const mergedTransactions = this.mergeTransactionsAndReceipts(transactions, receipts);
        return Promise.resolve(mergedTransactions);
    }
    */
}