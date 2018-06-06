import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { BlockTransactionParser } from "../../../src/common/erc721/BlockTransactionParser";

const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test BlockTransactionParser", () => {
    it("Should extract transactions from a block", async () => {
        const blockParser = new BlockParser();
        const blockTransactionParser = new BlockTransactionParser();
        const block = await blockParser.getBlockByNumber(5665445);

        const transactions = blockTransactionParser.extractTransactions(block);

        expect(transactions.length).to.equal(178);

        const results = transactions.filter(t => t._id === "0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b" );
        const transaction = results[0];

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
    })
})