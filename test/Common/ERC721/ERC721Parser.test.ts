import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { BlockTransactionParser } from "../../../src/common/erc721/BlockTransactionParser";
import { ERC721Parser } from "../../../src/common/erc721/ERC721Parser";
import { Database } from "../../../src/models/Database";

const mongoose = require("mongoose");
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

        const contractAddresses = await erc721Parser.extractContractAddresses(transactions);

        expect(transactions.length).to.equal(178);
        expect(contractAddresses.length).to.equal(33);

        // has 3 Approval transactions
        expect(contractAddresses.hasOwnProperty("0x80a7e048f37a50500351c204cb407766fa3bae7f"));
        expect(contractAddresses.hasOwnProperty("0x1460a58096d80a50a2f1f956dda497611fa4f165"));
        expect(contractAddresses.hasOwnProperty("0x87d598064c736dd0c712d329afcfaa0ccc1921a1"));

        const contracts = await erc721Parser.getERC721Contracts(contractAddresses);

        expect(contracts.length).to.equal(1);
        expect(contracts[0].address).to.equal("0x87d598064c736dd0c712d329afcfaa0ccc1921a1");
        expect(contracts[0].name).to.equal("CryptoFighters");
        expect(contracts[0].symbol).to.equal("CF");
        expect(contracts[0].totalSupply).is.a("string");
        expect(contracts[0].implementsERC721).is.true;

        const savedContracts = await erc721Parser.updateERC721ContractsInDatabase(contracts);

        const decodedLogs = await erc721Parser.extractDecodedLogsFromTransactions(transactions);

        expect(decodedLogs.length).to.equal(94);

        const decodedLogsFromATransaction = decodedLogs.filter((log) => {
            return log.address === "0x80A7E048F37A50500351C204Cb407766fA3baE7f"
        })[0];

        expect(decodedLogsFromATransaction.events.length).to.equal(3);
        expect(decodedLogsFromATransaction.name).to.equal("Approval");
        expect(decodedLogsFromATransaction.address).to.equal("0x80A7E048F37A50500351C204Cb407766fA3baE7f");

        const transactionOperations = await erc721Parser.parseTransactionOperations(transactions, savedContracts);

        expect(transactionOperations.length).to.equal(1);

        const approvalTxOps = transactionOperations.filter((txOps) => {
            return txOps.type === "Approval"
        })[0];

        expect(approvalTxOps.originalTransactionId).to.equal("0x39f5aa0e8782662503910daefa905876cd7b798dab3c15dc0f361ea98ab55cdb");
        expect(approvalTxOps.transactionId).to.equal("0x39f5aa0e8782662503910daefa905876cd7b798dab3c15dc0f361ea98ab55cdb-0");
        expect(approvalTxOps.type).to.equal("Approval");
        expect(approvalTxOps.from).to.equal("0xdcf005aa5550f76cd32c925c06a570bc36b0ac6f");
        expect(approvalTxOps.to).to.equal("0xb2c3531f77ee0a7ec7094a0bc87ef4a269e0bcfc");
        expect(approvalTxOps.value).to.equal("0");
        expect(mongoose.Types.ObjectId.isValid(approvalTxOps.contract)).is.true;

        const results = await erc721Parser.updateTransactionOperationsInDatabase(transactionOperations);

        expect(results.length).to.equal(1);
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

        const result = await erc721Parser.updateERC721ContractInDatabase(erc721Contract_CF);
        // NOTE: check the database, delete the record then run the test, it should appear again.
    })
})