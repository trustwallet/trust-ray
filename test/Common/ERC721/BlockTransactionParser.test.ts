import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { BlockTransactionParser } from "../../../src/common/erc721/BlockTransactionParser";
import { Database } from "../../../src/models/Database";

const config = require("config");
const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test BlockTransactionParser", () => {
    const getTransactionByID = (transactions: any[], id: string) => {
        const results = transactions.filter(t => t._id === id );
        return results[0];
    }

    let db: Database;

    before(async () => {
        db = new Database(config.get("MONGO.URI"));
        db.connect();
    })

    it("Should parse transactions from a block", async () => {
        const blockParser = new BlockParser();
        const blockTransactionParser = new BlockTransactionParser();

        const block = await blockParser.getBlockByNumber(5665445);

        const transactions = blockTransactionParser.extractTransactions(block);

        expect(transactions.length).to.equal(178);

        const transaction = getTransactionByID(transactions, "0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");

        expect(transaction._id).to.equal("0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");
        expect(transaction.blockNumber).to.equal(5665445);
        expect(transaction.timeStamp).to.equal("1527114762");
        expect(transaction.nonce).to.equal(730986);
        expect(transaction.from).to.equal("0x0681d8db095565fe8a346fa0277bffde9c0edbbf");
        expect(transaction.to).to.equal("0xd850942ef8811f2a866692a623011bde52a462c1");
        expect(transaction.value).to.equal("0");
        expect(transaction.gas).to.equal("109670");
        expect(transaction.gasPrice).to.equal("50000000000");
        expect(transaction.gasUsed).to.equal("0");
        expect(transaction.input).to.equal("0xa9059cbb00000000000000000000000008865fc372e98ba7f7d7c462fa0aea94ae44109900000000000000000000000000000000000000000000001d070ab97ed4fd8000");
        expect(transaction.addresses.toString()).to.equal("0x0681d8db095565fe8a346fa0277bffde9c0edbbf,0xd850942ef8811f2a866692a623011bde52a462c1");

        expect(transaction.contract).is.null;
        expect(transaction.receipt).is.undefined;

        const transactionIDs = blockTransactionParser.getTransactionIDs(transactions);

        expect(transactionIDs.length).to.equal(178);
        expect(transactionIDs[0]).to.equal("0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");

        const receipts = await blockTransactionParser.fetchReceiptsFromTransactionIDs(transactionIDs);

        expect(receipts.length).to.equal(178);

        const receipt = receipts[0];

        expect(receipt.blockHash).to.equal("0x8d811003afbb911b907a87f268cd9dc8a58af3431036b6ce653e8e754b1ef8da");
        expect(receipt.blockNumber).to.equal(5665445);
        expect(receipt.contractAddress).to.equal(null);
        expect(receipt.cumulativeGasUsed).to.equal(54835);
        expect(receipt.from).to.equal("0x0681d8db095565fe8a346fa0277bffde9c0edbbf");
        expect(receipt.to).to.equal("0xd850942ef8811f2a866692a623011bde52a462c1");
        expect(receipt.gasUsed).to.equal(54835);
        expect(receipt.status).to.equal("0x1");
        expect(receipt.transactionHash).to.equal("0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");
        expect(receipt.transactionIndex).to.equal(0);

        expect(receipt.logs.length).to.equal(1);
        expect(receipt.logs[0].address).to.equal("0xD850942eF8811f2A866692A623011bDE52a462C1");
        expect(receipt.logs[0].topics.length).to.equal(3);
        expect(receipt.logs[0].topics[0]).to.equal("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");

        const mergedTransactions = await blockTransactionParser.mergeTransactionsAndReceipts(transactions, receipts);

        expect(mergedTransactions.length).to.equal(178);

        const mergedTransaction = getTransactionByID(mergedTransactions, "0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");

        expect(mergedTransaction.contract).is.null;
        expect(mergedTransaction.receipt).is.not.undefined;

        expect(mergedTransaction.receipt.logs.length).to.equal(1);
        expect(mergedTransaction.receipt.logs[0].address).to.equal("0xD850942eF8811f2A866692A623011bDE52a462C1");
        expect(mergedTransaction.receipt.logs[0].topics.length).to.equal(3);
        expect(mergedTransaction.receipt.logs[0].topics[0]).to.equal("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");

        const savedTransactions = await blockTransactionParser.updateTransactionsInDatabase(mergedTransactions);

        expect(savedTransactions.length).to.equal(178);

        const savedTransaction = savedTransactions.filter(
            (stx) => { return stx._id === "0x39f5aa0e8782662503910daefa905876cd7b798dab3c15dc0f361ea98ab55cdb"; }
        )[0];

        /*  NOTE:
            this saved transaction has an ERC721 approval operation,
            but it won't get saved until transaction operation parsing is done later,
            by ERC721Parser.updateTransactionOperationsInDatabase().
        */
        expect(savedTransaction.operations.length).to.equal(0);
    })
})
