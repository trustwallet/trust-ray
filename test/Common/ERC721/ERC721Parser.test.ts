import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { BlockTransactionParser } from "../../../src/common/erc721/BlockTransactionParser";
import { ERC721Parser } from "../../../src/common/erc721/ERC721Parser";

const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test ERC721Parser", () => {
    it("Should extract all ERC* contract addresses from transactions", async () => {
        const blockParser = new BlockParser();
        const blockTransactionParser = new BlockTransactionParser();
        const erc721Parser = new ERC721Parser();

        const block = await blockParser.getBlockByNumber(5665445);
        const transactions = await blockTransactionParser.parse(block);
        const contractAddresses = await erc721Parser.extractContracts(transactions);

        expect(transactions.length).to.equal(178);
        expect(contractAddresses.length).to.equal(33);

        // has 3 Approval transactions
        expect(contractAddresses.hasOwnProperty("0x80a7e048f37a50500351c204cb407766fa3bae7f"));
        expect(contractAddresses.hasOwnProperty("0x1460a58096d80a50a2f1f956dda497611fa4f165"));
        expect(contractAddresses.hasOwnProperty("0x87d598064c736dd0c712d329afcfaa0ccc1921a1"));
    })

    it("Should get ERC721 contract", async () => {
        const erc721Parser = new ERC721Parser();

        const erc721_Contract_Address_CryptoFighters = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1";
        const erc721Contract_CF = await erc721Parser.getERC721Contract(erc721_Contract_Address_CryptoFighters);

        expect(erc721Contract_CF).to.have.property("name").eql("CryptoFighters");
        expect(erc721Contract_CF).to.have.property("symbol").eql("CF");
        expect(erc721Contract_CF).to.have.property("totalSupply").a("string");
        expect(erc721Contract_CF).to.have.property("implementsERC721").eql(true);

        const erc20_Contract_Address_Crypterium = "0x80A7E048F37A50500351C204Cb407766fA3baE7f";
        const erc20Contract_CRPT = await erc721Parser.getERC721Contract(erc20_Contract_Address_Crypterium);

        expect(erc20Contract_CRPT).is.undefined;
    })
})