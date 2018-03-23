import { contracts } from "../src/common/tokens/contracts";
import { TokenParser } from "../src/common/TokenParser"
import { assert } from "chai";

describe("Test TokenParser", () => {
    describe("Test isContractVerified", () => {
        const isContractVerified = new TokenParser().isContractVerified;
        it("Should return true when supply verified contract", () => {
            const contract = "0x5f3789907b35dce5605b00c0be0a7ecdbfa8a841"
            const expected = isContractVerified(contract)
            assert(true === expected);
        })
        it("Should return true when supply not verified contract", () => {
            const contract = "0x5f3789907b35dce5605b00c0be0a7ecdbfrandom"
            const expected = isContractVerified(contract)
            assert(false === expected);
        })
    })
})