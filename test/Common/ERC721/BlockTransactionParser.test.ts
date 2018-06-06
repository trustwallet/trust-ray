import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { BlockTransactionParser } from "../../../src/common/erc721/BlockTransactionParser";

const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test BlockTransactionParser", () => {
    const getTransactionByID = (transactions: any[], id: string) => {
        const results = transactions.filter(t => t._id === "0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b" );
        return results[0];
    }

    it("Should parse transactions from a block", async () => {
        const blockParser = new BlockParser();
        const blockTransactionParser = new BlockTransactionParser();
        const block = await blockParser.getBlockByNumber(5665445);

        const transactions = blockTransactionParser.extractTransactions(block);

        expect(transactions.length).to.equal(178);

        const transaction = getTransactionByID(transactions, "0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b");

        expect(transaction._id).to.equal("0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b");
        expect(transaction.blockNumber).to.equal(5665445);
        expect(transaction.timeStamp).to.equal("1527114762");
        expect(transaction.nonce).to.equal(4);
        expect(transaction.from).to.equal("0xe9e9f607d59da01e1c9a12a708ccfe7c9fdf8c32");
        expect(transaction.to).to.equal("0xbe98850613ae66d49d1da1abeaed09daa0e90660");
        expect(transaction.value).to.equal("123151800000000000");
        expect(transaction.gas).to.equal("21000");
        expect(transaction.gasPrice).to.equal("10000000000");
        expect(transaction.gasUsed).to.equal("0");
        expect(transaction.input).to.equal("0x");
        expect(transaction.addresses.toString()).to.equal("0xe9e9f607d59da01e1c9a12a708ccfe7c9fdf8c32,0xbe98850613ae66d49d1da1abeaed09daa0e90660");
        expect(transaction.hasOwnProperty("receipt")).to.equal(false);
        expect(transaction.hasOwnProperty("contract")).to.equal(false);

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
        expect(receipt.logs.length).to.equal(1);
        expect(receipt.logs[0].address).to.equal("0xD850942eF8811f2A866692A623011bDE52a462C1");
        expect(receipt.logs[0].topics.length).to.equal(3);
        expect(receipt.logs[0].topics[0]).to.equal("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
        expect(receipt.status).to.equal(true);
        expect(receipt.transactionHash).to.equal("0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");
        expect(receipt.transactionIndex).to.equal(0);

        const mergedTransactions = await blockTransactionParser.mergeTransactionsAndReceipts(transactions, receipts);

        expect(mergedTransactions.length).to.equal(178);

        const mergedTransaction = getTransactionByID(mergedTransactions, "0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b");

        expect(mergedTransaction.hasOwnProperty("receipt")).to.equal(true);
        expect(mergedTransaction.contract).is.null;
    })
})
