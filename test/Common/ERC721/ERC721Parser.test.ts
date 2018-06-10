import { BlockParser } from "../../../src/common/erc721/BlockParser";
import { ERC721Parser } from "../../../src/common/erc721/ERC721Parser";
import { Database } from "../../../src/models/Database";
import { ERC721Token } from "../../../src/models/Erc721TokenModel";

const mongoose = require("mongoose");
const config = require("config");
const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect

describe("Test ERC721Parser", () => {
    const getTransactionByID = (transactions: any[], id: string) => {
        const results = transactions.filter(t => t._id === id );
        return results[0];
    }

    let db: Database;
    let erc721Parser: ERC721Parser;

    before(async () => {
        db = new Database(config.get("MONGO.URI"));
        db.connect();

        erc721Parser = new ERC721Parser();
    })

    it("Should parse transactions from a block", async () => {
        const blockParser = new BlockParser();

        const block = await blockParser.getBlockByNumber(5665445);

        const transactions = erc721Parser.extractTransactions(block);

        expect(transactions.length).to.equal(178);

        const transaction = getTransactionByID(transactions, "0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");

        expect(transaction._id).to.equal("0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");
        expect(transaction.blockNumber).to.equal(5665445);
        expect(transaction.timeStamp).to.equal("1527114762");
        expect(transaction.nonce).to.equal(730986);
        expect(transaction.from).to.equal("0x0681d8db095565fe8a346fa0277bffde9c0edbbf");
        expect(transaction.to).to.equal("0xd850942ef8811f2a866692a623011bde52a462c1");
        expect(transaction.value).to.equal("0");
        expect(transaction.gas).to.equal("109670");
        expect(transaction.gasPrice).to.equal("50000000000");
        expect(transaction.gasUsed).to.equal("0");
        expect(transaction.input).to.equal("0xa9059cbb00000000000000000000000008865fc372e98ba7f7d7c462fa0aea94ae44109900000000000000000000000000000000000000000000001d070ab97ed4fd8000");
        expect(transaction.addresses.toString()).to.equal("0x0681d8db095565fe8a346fa0277bffde9c0edbbf,0xd850942ef8811f2a866692a623011bde52a462c1");

        expect(transaction.contract).is.null;
        expect(transaction.receipt).is.undefined;

        const transactionIDs = erc721Parser.getTransactionIDs(transactions);

        expect(transactionIDs.length).to.equal(178);
        expect(transactionIDs[0]).to.equal("0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");

        const receipts = await erc721Parser.fetchReceiptsFromTransactionIDs(transactionIDs);

        expect(receipts.length).to.equal(178);

        const receipt = receipts[0];

        expect(receipt.blockHash).to.equal("0x8d811003afbb911b907a87f268cd9dc8a58af3431036b6ce653e8e754b1ef8da");
        expect(receipt.blockNumber).to.equal(5665445);
        expect(receipt.contractAddress).to.equal(null);
        expect(receipt.cumulativeGasUsed).to.equal(54835);
        expect(receipt.from).to.equal("0x0681d8db095565fe8a346fa0277bffde9c0edbbf");
        expect(receipt.to).to.equal("0xd850942ef8811f2a866692a623011bde52a462c1");
        expect(receipt.gasUsed).to.equal(54835);
        expect(receipt.status).to.equal("0x1");
        expect(receipt.transactionHash).to.equal("0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");
        expect(receipt.transactionIndex).to.equal(0);

        expect(receipt.logs.length).to.equal(1);
        expect(receipt.logs[0].address).to.equal("0xD850942eF8811f2A866692A623011bDE52a462C1");
        expect(receipt.logs[0].topics.length).to.equal(3);
        expect(receipt.logs[0].topics[0]).to.equal("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");

        const mergedTransactions = await erc721Parser.attachReceiptsToTransactions(transactions, receipts);

        expect(mergedTransactions.length).to.equal(178);

        const mergedTransaction = getTransactionByID(mergedTransactions, "0xa22465a41c60485f29eb4f8f57a04836ab56cd43faafe2439c6de8938f10e974");

        expect(mergedTransaction.contract).is.null;
        expect(mergedTransaction.receipt).is.not.undefined;

        expect(mergedTransaction.receipt.logs.length).to.equal(1);
        expect(mergedTransaction.receipt.logs[0].address).to.equal("0xD850942eF8811f2A866692A623011bDE52a462C1");
        expect(mergedTransaction.receipt.logs[0].topics.length).to.equal(3);
        expect(mergedTransaction.receipt.logs[0].topics[0]).to.equal("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");

        const savedTransactions = await erc721Parser.updateTransactionsInDatabase(mergedTransactions);

        expect(savedTransactions.length).to.equal(178);

        const savedTransaction = savedTransactions.filter(
            (stx) => { return stx._id === "0x39f5aa0e8782662503910daefa905876cd7b798dab3c15dc0f361ea98ab55cdb"; }
        )[0];

        /*  NOTE:
            this saved transaction has an ERC721 approval operation,
            but it won't get saved until transaction operation parsing is done later,
            by ERC721Parser.updateTransactionOperationsInDatabase().
        */
        expect(savedTransaction.operations.length).to.equal(0);
    })

    it("Should extract all ERC* contract addresses from transactions", async () => {
        const blockParser = new BlockParser();
        const block = await blockParser.getBlockByNumber(5665445);
        const transactions = erc721Parser.extractTransactions(block);
        const transactionIDs = erc721Parser.getTransactionIDs(transactions);
        const receipts = await erc721Parser.fetchReceiptsFromTransactionIDs(transactionIDs);
        const transactionsWithReceipts = await erc721Parser.attachReceiptsToTransactions(transactions, receipts);

        const transactionWithoutLogs = transactionsWithReceipts.filter((tx) => {
            return tx._id === "0x8fbcf855223bc60f996865e7a05297dc41907b8cbddd03613db462dcb103117a"
        })[0];
        const emptyDecodedLogs = erc721Parser.extractDecodedLogsFromTransaction(transactionWithoutLogs);

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

        // TODO: extractDecodedLogsFromTransactions() is only used in test, need to be removed.
        const decodedLogs = await erc721Parser.extractDecodedLogsFromTransactions(transactionsWithReceipts);

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

        // NOTE: please note this method returns saved transactions instead of saved transaction operations.
        const savedTransactions = await erc721Parser.updateTransactionOperationsInDatabase(transactionOperations);

        expect(savedTransactions.length).to.equal(1);
        expect(savedTransactions[0]._id).to.equal("0x39f5aa0e8782662503910daefa905876cd7b798dab3c15dc0f361ea98ab55cdb");

        /*
            NOTE:
            after calling ERC721Parser.updateTransactionOperationsInDatabase(),
            the transaction's operations get populated.
        */
        const transactionsInDB = await erc721Parser.getSavedTransactionsInDatabase(5665445);
        const transactionInDB = transactionsInDB.filter((tx) => {
           return tx._id === "0x39f5aa0e8782662503910daefa905876cd7b798dab3c15dc0f361ea98ab55cdb";
        })[0];

        expect(transactionInDB.operations.length).to.equal(1);
    })

    it("Should get ERC721 contract", async () => {
        const erc20_Contract_Address_Crypterium = "0x80A7E048F37A50500351C204Cb407766fA3baE7f";
        const erc20Contract_CRPT = await erc721Parser.getERC721Contract(erc20_Contract_Address_Crypterium);

        expect(erc20Contract_CRPT).is.undefined;

        const erc721_Contract_Address_CryptoFighters = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1";
        const erc721Contract_CF = await erc721Parser.getERC721Contract(erc721_Contract_Address_CryptoFighters);

        expect(erc721Contract_CF).to.have.property("name").eql("CryptoFighters");
        expect(erc721Contract_CF).to.have.property("symbol").eql("CF");
        expect(erc721Contract_CF).to.have.property("totalSupply").a("string");
        expect(erc721Contract_CF).to.have.property("implementsERC721").eql(true);

        const savedERC721Contract = await erc721Parser.updateERC721ContractInDatabase(erc721Contract_CF);

        expect(savedERC721Contract.name).to.equal("CryptoFighters");
    })

    it("Should create operations from saved transactions", async () => {
        const savedTransactions = await erc721Parser.getSavedTransactionsInDatabase(5665445);

        const operations = await erc721Parser.createOperations(savedTransactions);

        expect(operations.length).to.equal(2);
        expect(operations[0].address).to.equal("0xb2c3531f77ee0a7ec7094a0bc87ef4a269e0bcfc");
        expect(operations[1].address).to.equal("0xdcf005aa5550f76cd32c925c06a570bc36b0ac6f");
        expect(operations[0].contract).to.deep.equal(operations[1].contract);

        await erc721Parser.updateTokenOwnership(5665445);

        const owner1 = await ERC721Token.find({_id: "0xb2c3531f77ee0a7ec7094a0bc87ef4a269e0bcfc"});
        const owner2 = await ERC721Token.find({_id: "0xdcf005aa5550f76cd32c925c06a570bc36b0ac6f"});

        expect(owner1[0].tokens[0]).to.deep.equal(owner2[0].tokens[0]);
    })

    it("Should start parsing", async () => {
        return await erc721Parser.parse(
            await new BlockParser().getBlockByNumber(5665445)
        );
    })
})