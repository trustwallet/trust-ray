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

    describe("Test getNumberBlocks() in forward mode", () => {
        let blockchainParser;
        const concurrentBlocks = 1;
        const rebalanceOffsets = [30];
        const ascending = true;

        beforeEach(() => {
            blockchainParser = new BlockchainParser();
            blockchainParser.concurrentBlocks = concurrentBlocks;
            blockchainParser.rebalanceOffsets = rebalanceOffsets;
            blockchainParser.ascending = ascending;
        });

        it("Should return only one block if difference between lastBlock and startBlock > 10 when ascending", () => {
            const startBlock = 100;
            const lastBlock = 112;
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([100]).to.have.lengthOf(1);
        });

        it("Should return only two block if difference between lastBlock and startBlock < 10 when ascending", () => {
            const startBlock = 100;
            const lastBlock = 105
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([70, 100]).to.have.lengthOf(2);
        });
    });

    describe("Test getNumberBlocks() in backword mode", () => {
        let blockchainParser;
        const concurrentBlocks = 2;
        const rebalanceOffsets = [33];
        const ascending = false;

        beforeEach(() => {
            blockchainParser = new BlockchainParser();
            blockchainParser.concurrentBlocks = concurrentBlocks;
            blockchainParser.rebalanceOffsets = rebalanceOffsets;
            blockchainParser.ascending = ascending;
        });

        it("Should return only one block if difference between lastBlock and startBlock > 10 when descending", () => {
            const startBlock = 100;
            const lastBlock = 112;
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([100]).to.have.lengthOf(1);
        });

        it("Should return only two block if difference between lastBlock and startBlock < 10 when descending", () => {
            const startBlock = 100;
            const lastBlock = 105
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([100]).to.have.lengthOf(1);
        });
    });
})