import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { BlockTransactionParser } from "../../../src/common/erc721/BlockTransactionParser";
import { ERC721Parser } from "../../../src/common/erc721/ERC721Parser";

const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test ERC721Parser", () => {
    it("Should extract ERC contract addresses from transactions", async () => {
        const blockParser = new BlockParser();
        const blockTransactionParser = new BlockTransactionParser();
        const erc721Parser = new ERC721Parser();

        const block = await blockParser.getBlockByNumber(5665445);
        const transactions = await blockTransactionParser.parse(block);
        const contractAddresses = await erc721Parser.extractContracts(transactions);

        expect(contractAddresses.length).to.equal(0);

        // TODO: loop from block number 1 to see
    })
})