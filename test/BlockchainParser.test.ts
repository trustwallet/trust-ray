import { expect } from "chai";
import { assert } from "chai";
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

    describe("Test getBlocksToParse", () => {
        const getBlocksToParse = new BlockchainParser().getBlocksToParse;

        const tests = [
            {startBlock: 2, endBlock: 2, maxConcurrentBlocks: 1, expected: 1},
            {startBlock: 1, endBlock: 2, maxConcurrentBlocks: 1, expected: 1},
            {startBlock: 1, endBlock: 2, maxConcurrentBlocks: 2, expected: 2},
            {startBlock: 1, endBlock: 2, maxConcurrentBlocks: 10, expected: 2},
            {startBlock: 1, endBlock: 3, maxConcurrentBlocks: 1, expected: 1},
            {startBlock: 1, endBlock: 3, maxConcurrentBlocks: 2, expected: 2},
            {startBlock: 1, endBlock: 3, maxConcurrentBlocks: 3, expected: 3},
            {startBlock: 1, endBlock: 3, maxConcurrentBlocks: 4, expected: 3},
        ];

        tests.forEach(({startBlock, endBlock, maxConcurrentBlocks, expected}) => {
            const range: number = getBlocksToParse(startBlock, endBlock, maxConcurrentBlocks);
            it(`Should generate ${expected} when startBlock ${startBlock}, endBlock ${endBlock}, maxConcurrentBlocks ${maxConcurrentBlocks},`, () => {
                expect(range).to.be.an("number");
                expect(range).to.be.equal(expected);
            });
        });
    });

    describe("Test getNumberBlocks() in forward mode", () => {
        let blockchainParser;
        const maxConcurrentBlocks = 1;
        const rebalanceOffsets = [30];
        const minRebalanceBlock = Math.min(...rebalanceOffsets);
        const ascending = true;

        beforeEach(() => {
            blockchainParser = new BlockchainParser();
            blockchainParser.maxConcurrentBlocks = maxConcurrentBlocks;
            blockchainParser.rebalanceOffsets = rebalanceOffsets;
            blockchainParser.ascending = ascending;
        });

        it(`Should return two blocks if difference between block > then min rebalance offset = ${minRebalanceBlock} when ascending`, () => {
            const startBlock = 100;
            const lastBlock = 112;
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([70, 100]).to.have.lengthOf(2);
        });

        it(`Should return two blocks if difference between block < then min rebalance offset = ${minRebalanceBlock} when ascending`, () => {
            const startBlock = 100;
            const lastBlock = 105
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([70, 100]).to.have.lengthOf(2);
        });
    });

    describe("Test getNumberBlocks() in backword mode", () => {
        let blockchainParser;
        const maxConcurrentBlocks = 1;
        const rebalanceOffsets = [33];
        const ascending = false;

        beforeEach(() => {
            blockchainParser = new BlockchainParser();
            blockchainParser.maxConcurrentBlocks = maxConcurrentBlocks;
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
            const lastBlock = 105;
            const range = blockchainParser.getNumberBlocks(startBlock, lastBlock, ascending, rebalanceOffsets);

            expect(range).to.be.an("array");
            expect(range).to.be.include.ordered.members([100]).to.have.lengthOf(1);
        });
    });
})