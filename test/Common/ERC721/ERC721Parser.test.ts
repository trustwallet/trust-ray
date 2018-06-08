import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { BlockTransactionParser } from "../../../src/common/erc721/BlockTransactionParser";
import { ERC721Parser } from "../../../src/common/erc721/ERC721Parser";
import { Database } from "../../../src/models/Database";

const config = require("config");
const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test ERC721Parser", () => {
    let db: Database;

    before(async () => {
        db = new Database(config.get("MONGO.URI"));
        db.connect();
    })

    it("Should extract all ERC* contract addresses from transactions", async () => {
        const blockParser = new BlockParser();
        const blockTransactionParser = new BlockTransactionParser();
        const erc721Parser = new ERC721Parser();

        const block = await blockParser.getBlockByNumber(5665445);
        const transactions = await blockTransactionParser.parse(block);

        const emptyDecodedLogs = erc721Parser.extractDecodedLogsFromTransaction(
            transactions.filter((tx) => {
                return tx._id === "0x8fbcf855223bc60f996865e7a05297dc41907b8cbddd03613db462dcb103117a"
            })[0]
        );

        expect(emptyDecodedLogs.length).to.equal(0);

        const decodedLogs = erc721Parser.extractDecodedLogsFromTransaction(
            transactions.filter((tx) => {
                return tx._id === "0x1020494743d0a85187c9cc92f1e8f649552df9502464f72e219e7363d7446a17"
            })[0]
        );

        expect(decodedLogs.length).to.equal(1);
        expect(decodedLogs[0].name).to.equal("Approval");
        expect(decodedLogs[0].address).to.equal("0x80A7E048F37A50500351C204Cb407766fA3baE7f");
        expect(decodedLogs[0].events.length).to.equal(3);

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

        const erc20_Contract_Address_Crypterium = "0x80A7E048F37A50500351C204Cb407766fA3baE7f";
        const erc20Contract_CRPT = await erc721Parser.getERC721Contract(erc20_Contract_Address_Crypterium);

        expect(erc20Contract_CRPT).is.undefined;

        const erc721_Contract_Address_CryptoFighters = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1";
        const erc721Contract_CF = await erc721Parser.getERC721Contract(erc721_Contract_Address_CryptoFighters);

        expect(erc721Contract_CF).to.have.property("name").eql("CryptoFighters");
        expect(erc721Contract_CF).to.have.property("symbol").eql("CF");
        expect(erc721Contract_CF).to.have.property("totalSupply").a("string");
        expect(erc721Contract_CF).to.have.property("implementsERC721").eql(true);

        const result = await erc721Parser.updateDatabase(erc721Contract_CF);
        // NOTE: check the database, delete the record then run the test, it should appear again.
    })
})