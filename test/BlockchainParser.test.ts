import { expect } from "chai";
import "mocha";
import { BlockchainParser } from "../src/common/BlockchainParser";

describe("Test BlockchainParser", () => {
    describe("Test getBlocksRange()", () => {
        let getBlocksRange;

        beforeEach(() => {
            getBlocksRange = new BlockchainParser().getBlocksRange;
        });

        it("Generate array of positive numbers", () => {
            const range = getBlocksRange(1, 3);
            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([1, 2, 3]);
        });
        it("Generate array of positive numbers", () => {
            const range = getBlocksRange(5, 5);
            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([5]);
        });
    });

    describe("Test getNumberBlocks()", () => {;
        let blockchainParser;

        beforeEach(() => {
            blockchainParser = new BlockchainParser();
        });

        it("Should return only one block if difference between lastBlock and startBlock > 10 when ascending", () => {
            const concurrentBlocks = 1;
            const rebalanceOffsets = [30];
            const ascending = true;
            const startBlock = 100;
            const lastBlock = 112
            const getBlocksToParse = blockchainParser.getBlocksToParse(startBlock, lastBlock, concurrentBlocks);
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([100])
        });

        it("Should return only two block if difference between lastBlock and startBlock < 10 when ascending", () => {
            const concurrentBlocks = 1;
            const rebalanceOffsets = [30];
            const ascending = true;
            const startBlock = 100;
            const lastBlock = 105
            const getBlocksToParse = blockchainParser.getBlocksToParse(startBlock, lastBlock, concurrentBlocks);
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([70, 100])
        });
    });
})