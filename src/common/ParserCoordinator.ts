
class TransactionParser {

    public parseTransactionAction(transaction: any) {
        // parse the transaction type/action
        // put it into subdocument "action"
        // save it into DB
        // and trigger event via:
        // process.emit("transactionTypeParsed")
    }

    public start() {
        // parse transactions and trigger event for every
        // parsed transaction via:
        // process.emit("baseTransactionParsed", transaction)
    }
}
class TokenParser {

    public parseTokenBalance(transaction: any) {
        // parse the token balance changes from the
        // transaction action and update the
        // balances in the DB
    }
}

export class ParserCoordinator {

    private transactionParser = new TransactionParser();
    private tokenParser = new TokenParser();

    constructor() {

        // setup hooks
        process.on("baseTransactionParsed", (transaction: any) => {
            this.transactionParser.parseTransactionAction(transaction);
        });

        process.on("transactionTypeParsed", (transaction: any) => {
            this.tokenParser.parseTokenBalance(transaction);
        });
    }

    public start() {
        this.transactionParser.start();
    }

}