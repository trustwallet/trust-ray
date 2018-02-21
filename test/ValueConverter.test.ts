import { getValueInEth } from "../src/common/ValueConverter";
import { assert } from "chai";
import { BigNumber } from "bignumber.js";

const tests = [
    {value: "6539186655", decimal: 6, expected: new BigNumber("6539.186655")},
    {value: "70100000000", decimal: 8, expected: new BigNumber("701")},
    {value: "356757302184", decimal: 8, expected: new BigNumber("3567.57302184")},
    {value: "11429358992436", decimal: 8, expected: new BigNumber("114293.58992436")},
    {value: "74650000000000000000", decimal: 18, expected: new BigNumber("74.65")},
    {value: "590000000000000000000", decimal: 18, expected: new BigNumber("590")},
    {value: "30000000000000000000000", decimal: 18, expected: new BigNumber("30000")},
]

describe("Test ValueConverter", () => {
    describe("Test getValueInEth", () => {
        tests.forEach(({value, decimal, expected}) => {
            it(`should turn value ${value} and decimal ${decimal} to ${expected}`, () => {
                const result = getValueInEth(value, decimal);
                assert(expected.isEqualTo(result))
            });
        })
    })
})