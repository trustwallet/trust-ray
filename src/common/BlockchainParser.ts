
import { TransactionParser } from "./TransactionParser";
import { TokenParser } from "./TokenParser";


export class BlockchainParser {

    private transactionParser: TransactionParser;
    private tokenParser: TokenParser;

    constructor() {
        this.transactionParser = new TransactionParser();
        this.tokenParser = new TokenParser();
    }

    public startParsing() {

    }

}