
class TransactionParser {
    public parseTransactionAction(transaction: any) {}
}
class TokenParser {
    public parseTokenBalance(transaction: any) {}
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
            // save transaction

            // start token parsing
            this.tokenParser.parseTokenBalance(transaction);
        });
    }

}