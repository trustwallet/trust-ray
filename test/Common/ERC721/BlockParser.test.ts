import { BlockParser } from "../../../src/common/erc721/BlockParser";

const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test BlockParser", () => {
    it("Should get a block by block number", async () => {
        const blockParser = new BlockParser();
        const block = await blockParser.getBlockByNumber(5665445);

        expect(block.number).is.equal(5665445);
        expect(block.hash).is.equal("0x8d811003afbb911b907a87f268cd9dc8a58af3431036b6ce653e8e754b1ef8da");
        expect(block.transactions.length).is.equal(178);
    })
})