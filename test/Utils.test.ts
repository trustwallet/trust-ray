import { removeScientificNotationFromNumbString } from "../src/common/Utils";
import { expect } from "chai";
import "mocha";

describe("Test Util.ts", () => {
    describe("Tests removeScientificNotationFromNumbString()", () => {
            it("Converts a number given as string containing scientific notation #1", () => {
                const result = removeScientificNotationFromNumbString("2e+24");
                expect(result).to.be.equal("2000000000000000000000000");
                expect(result).to.be.a("string");
            });
         
            it("Converts a number given as string containing scientific notation #2", () => {
                const result = removeScientificNotationFromNumbString("2.2093167076133973e+22");
                expect(result).to.be.equal("22093167076133973000000");
                expect(result).to.be.a("string");
            });
            it("Returns number given as string", () => {
                const result = removeScientificNotationFromNumbString("1265");
                expect(result).to.be.equal("1265");
                expect(result).to.be.a("string");
            });
    });
})
