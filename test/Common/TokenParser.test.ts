import { contracts } from "../../src/common/tokens/contracts";
import { ERC20Parser } from "../../src/common/ERC20Parser"
import { TokenParser } from "../../src/common/TokenParser"
const chai = require("chai")
chai.use(require("chai-as-promised"))
const should = chai.should()
const expect = chai.expect
const assert = chai.assert

describe("Test ERC20Parser", () => {
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

    describe("Test getERC20Contract", () => {
        it("Should sucsesscully parse ERC20 combatible contract", async () => {
                const getERC20Contract = new ERC20Parser().getERC20Contract
                const erc20Address = "0xeda8b016efa8b1161208cf041cd86972eee0f31e"
                const erc20contract = await getERC20Contract(erc20Address)

                expect(erc20contract).to.have.property("name").eql("I HOUSE TOKEN")
                expect(erc20contract).to.have.property("symbol").eql("IHT")
                expect(erc20contract).to.have.property("decimals").eql("18")
                expect(erc20contract).to.have.property("totalSupply").eql("1000000000000000000000000000")

        })
    })

    describe("Test getContractName", function() {
        this.timeout(4000)
        const getContractName = new ERC20Parser().getContractName
        const tests = [
            {address: "0x5c743a35e903f6c584514ec617acee0611cf44f3", name: "name", type: "string", expectedName: "Experty Token"},
            // {address: "0xe41d2489571d322189246dafa5ebde1f4699f498", name: "name", type: "string", expectedName: "0x Protocol Token"},
            {address: "0x38c6a68304cdefb9bec48bbfaaba5c5b47818bb2", name: "NAME", type: "string", expectedName: "HPBCoin"},
            {address: "0xe4c94d45f7aef7018a5d66f44af780ec6023378e", name: "name", type: "bytes32", expectedName: "proxyCC"},
            {address: "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0", name: "name", type: "bytes32 0f 0x00...", expectedName: ""},
            {address: "0x2abb88d483ec7c4f5ae078670f156434a5129f40", name: "name", type: "bytes16", expectedName: "KoveredPay"},
            {address: "0xd51e852630debc24e9e1041a03d80a0107f8ef0c", name: "Not defined", type: "Not defined", expectedName: ""},
            {address: "0x28c8d01ff633ea9cd8fc6a451d7457889e698de6", name: "Not defined", type: "Not defined", expectedName: ""},
            {address: "0x8065d58b69f8ede4f02b2b7331a6d797f2cdcfac", name: "No ABI", type: "No ABI", expectedName: "LILAND"}
        ]

        tests.forEach(({address, name, type, expectedName}) => {
            it(`For address ${address} with name = "${name}" and type "${type}" should return contract name ${expectedName}`, async () => {
                const contractName = await getContractName(address)

                expect(contractName).to.be.an("string")
                expect(contractName).to.be.equal(expectedName)
            })
        })
    })

    describe("Test getContractSymbol", () => {
        const getContractSybol = new ERC20Parser().getContractSymbol
        const tests = [
            {address: "0xeda8b016efa8b1161208cf041cd86972eee0f31e", symbol: "symbol", type: "string", expectedSymbol: "IHT"},
            {address: "0x05435983b4736d18d3c56e860d607f2825dc5d64", symbol: "symbol", type: "bytes32", expectedSymbol: "PASS"},
            {address: "0x38c6a68304cdefb9bec48bbfaaba5c5b47818bb2", symbol: "SYMBOL", type: "string", expectedSymbol: "HPB"},
            {address: "0x35f85c7d1a8fe03c40b8e3b326b4de04a1db0b51", symbol: "Not defined", type: "Not defined", expectedSymbol: ""},
            {address: "0x28c8d01ff633ea9cd8fc6a451d7457889e698de6", symbol: "Not defined", type: "Not defined", expectedSymbol: "ETG"},
            {address: "0x8065d58b69f8ede4f02b2b7331a6d797f2cdcfac", symbol: "No ABI", type: "No ABI", expectedSymbol: "LILAND"}
        ]

        tests.forEach(({address, symbol, type, expectedSymbol}) => {
            it(`For address ${address} with symbol = "${symbol}" and type "${type}" should return contract symbol ${expectedSymbol}`, async () => {
                const contractName = await getContractSybol(address)

                expect(contractName).to.be.an("string")
                expect(contractName).to.be.equal(expectedSymbol)
            })
        })
    })

    describe("Test getContractDecimals", () => {
        const getContractDecimals = new ERC20Parser().getContractDecimals
        const tests = [
            {address: "0x57ad67acf9bf015e4820fbd66ea1a21bed8852ec", decimals: "decimals", type: "uint8", expectedDecimals: "18"},
            {address: "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0", decimals: "decimals", type: "uint256", expectedDecimals: "18"},
            {address: "0xb5a5f22694352c15b00323844ad545abb2b11028", decimals: "decimals", type: "uint256", expectedDecimals: "0"},
            {address: "0x38c6a68304cdefb9bec48bbfaaba5c5b47818bb2", decimals: "DECIMALS", type: "uint256", expectedDecimals: "18"},
            // {address: "", decimals: "DECIMALS", type: "uint256", expectedDecimal: ""}, // TO DO
            // {address: "", decimals: "", type: "", expectedDecimal: ""},
            // {address: "", decimals: "Not defined", type: "Not defined", expectedDecimal: ""},
            {address: "0x8065d58b69f8ede4f02b2b7331a6d797f2cdcfac", symbol: "No ABI", type: "No ABI", expectedDecimals: "18"}
            // {address: "?", name: "NAME", type: "bytes32", expectedName: "?"} // TO DO
            // {address: "?", name: "?", type: "?", expectedName: "?"} // TO DO
        ]

        tests.forEach(({address, decimals, type, expectedDecimals}) => {
            it(`For address ${address} with decimals = "${decimals}" and type "${type}" should return decimals ${expectedDecimals}`, async () => {
                const contractName = await getContractDecimals(address)

                expect(contractName).to.be.an("string")
                expect(contractName).to.be.equal(expectedDecimals)
            })
        })
    })

    describe("Test getContractTotalSupply", () => {
        const getContractTotalSupply = new ERC20Parser().getContractTotalSupply
        const tests = [
            {address: "0x57ad67acf9bf015e4820fbd66ea1a21bed8852ec", totalSupply: "totalSupply", type: "uint256", expectedTotalSupply: "999999999017098867808380000"},
            // {address: "", totalSupply: "Not defined", type: "Not defined", expectedTotalSupply: ""} // TO DO
        ]

        tests.forEach(({address, totalSupply, type, expectedTotalSupply}) => {
            it(`For address ${address} with totalSupply = "${totalSupply}" and type "${type}" should return total supply ${expectedTotalSupply}`, async () => {
                const contractTotalSupply = await getContractTotalSupply(address)

                expect(contractTotalSupply).to.be.an("string")
                expect(contractTotalSupply).to.be.equal(expectedTotalSupply)
            })
        })
    })

    describe("Test getContract", () => {
        const getContract = new TokenParser().getContract

        it("Should get ERC20", async () => {
            const contract = "0xeda8b016efa8b1161208cf041cd86972eee0f31e"
            const result = await getContract(contract)

            result.should.have.property("verified").to.equal(true)
            result.should.have.property("name").eql("I HOUSE TOKEN")
            result.should.have.property("symbol").eql("IHT")
            result.should.have.property("decimals").eql(18)
            result.should.have.property("totalSupply").eql("1000000000000000000000000000")
        })
    })
})