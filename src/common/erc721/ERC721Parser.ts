import * as winston from "winston";
import * as Bluebird from "bluebird";

import { loadContractABIs, removeScientificNotationFromNumbString, setDelay } from "../Utils";
import { Config } from "../Config";
import { nameABI, ownerOfABI, standardERC721ABI } from "../abi/ABI";
import { contracts } from "../tokens/contracts";
import {
    IBlock, IContract, IDecodedLog, IExtractedTransaction,
    ISavedTransaction, ITransaction, ITransactionOperation
} from "../CommonInterfaces";
import { ERC721Contract } from "../../models/Erc721ContractModel";
import { ERC721TransactionOperation } from "../../models/Erc721TransactionOperationModel";
import { ERC721Transaction } from "../../models/Erc721TransactionModel";
import { ERC721Token } from "../../models/Erc721TokenModel";
import { BlockchainState } from "../BlockchainState";
import { LastParsedBlock } from "../../models/LastParsedBlockModel";
import { BlockParser } from "./BlockParser";

export class ERC721Parser {
    private abiDecoder = require("abi-decoder");
    private abiList = loadContractABIs();

    private operationTypes = ["Transfer", "Approval", "approve"];

    // TODO: implement cache
    private cachedContracts = {};

    constructor() {
        for (const abi of this.abiList) {
            this.abiDecoder.addABI(abi);
        }
    }

    public start() {
        winston.info(`ERC721Parser.start()`);

        BlockchainState.getBlockState()
            .then(([lastBlockInChain, lastBlockInDb]) => {
                return Promise.all([
                    this.performStart(3, true, 0, lastBlockInChain, lastBlockInDb._doc.lastTokensBlockForERC721, lastBlockInDb._doc.lastTokensBackwardBlockForERC721),
                    this.performStart(3, false, 0, lastBlockInChain, lastBlockInDb._doc.lastTokensBlockForERC721, lastBlockInDb._doc.lastTokensBackwardBlockForERC721)
                ]);
            })
            .then(() => {
                this.scheduleNextParsing();
            });
    }

    private performStart(concurrentNumber = 3, forward = true, firstBlockInChain = 0,
                         lastBlockInChain = 0, lastForwardBlockInDb = 0, lastBackwardBlockInDb) {
        const blockNumbers = [];
        if (forward) {
            for (let i = lastForwardBlockInDb + 1; i < lastForwardBlockInDb + 1 + concurrentNumber; i++) {
                if (i <= lastBlockInChain) {
                    blockNumbers.push(i)
                }
            }

            winston.info(`ERC721Parser.performStart(forward), ${blockNumbers}`);
        } else {
            for (let i = lastBackwardBlockInDb - 1; i > lastBackwardBlockInDb - 1 - concurrentNumber; i--) {
                if (i >= firstBlockInChain) {
                    blockNumbers.push(i)
                }
            }

            winston.info(`ERC721Parser.performStart(backward), ${blockNumbers}`);
        }

        const promises = blockNumbers.map((blockNumber) => {
            return new Promise((resolve, reject) => {
                new BlockParser().getBlockByNumber(blockNumber)
                    .then((block) => {
                        return this.parse(block);
                    })
                    .then(() => {
                        resolve(this.saveLastParsedBlock(blockNumber, forward));
                    })
                    .catch((err: Error) => {
                        winston.error(`Error parsing block: ${blockNumber}, error: ${err}`);
                        reject(err);
                    });
            });
        });

        return Promise.all(promises)
            .then(() => {
                return Promise.resolve();
            })
            .catch((err: Error) => {
                winston.error(`Error parsing blocks: ${blockNumbers}, error: ${err}`);
            });
    }

    public async parse(block): Promise<any[]> {
        winston.info(`ERC721Parser.parse(${block.number})`);

        const transactions = this.extractTransactions(block);
        const transactionIDs = this.getTransactionIDs(transactions);
        const receipts = await this.fetchReceiptsFromTransactionIDs(transactionIDs);
        const mergedTransactions = await this.attachReceiptsToTransactions(transactions, receipts);

        const results = await this.updateTransactionsInDatabase(mergedTransactions);
        winston.info(`ERC721Parser.updateTransactionsInDatabase, rows: ${results.length}, block: ${block.number}`);

        const contractAddresses = await this.extractContractAddresses(transactions);
        const contracts = await this.getERC721Contracts(contractAddresses);

        const savedContracts = await this.updateERC721ContractsInDatabase(contracts);
        if (savedContracts.length > 0) {
            winston.info(`ERC721Parser.updateERC721ContractsInDatabase, rows: ${savedContracts.length}, block: ${block.number}`);
        }

        const transactionOperations = await this.parseTransactionOperations(transactions, savedContracts);

        const savedTransactionOperations = await this.updateTransactionOperationsInDatabase(transactionOperations);
        if (savedTransactionOperations.length > 0) {
            winston.info(`ERC721Parser.updateTransactionOperationsInDatabase, rows: ${savedTransactionOperations.length}, block: ${block.number}`);
        }

        const savedTokenOwnerships = await this.updateTokenOwnership(block.number);
        // TODO: print out the number of rows affected
        // winston.info(`ERC721Parser.updateTokenOwnership, rows: ${savedTokenOwnerships}, block: ${block.number}`);

        return Promise.resolve(savedTokenOwnerships);
    }

    public extractTransactions(block): any[] {
        return this.getRawTransactions(block).map((tx: ITransaction) => {
            return new ERC721Transaction(this.extractTransaction(block, tx));
        });
    }

    public getTransactionIDs(transactions): string[] {
        return transactions.map((tx: IExtractedTransaction) => tx._id);
    }

    public async fetchReceiptsFromTransactionIDs (transactionIDs: string[]) {
        const batchLimit = 300
        const chunk = (list, size) => list.reduce((r, v) =>
            (!r.length || r[r.length - 1].length === size ?
                r.push([v]) : r[r.length - 1].push(v)) && r
            , []);
        const chunkTransactions = chunk(transactionIDs, batchLimit)

        try {
            const receipts = await Bluebird.map(chunkTransactions, (chunk: any) => {
                return new Promise((resolve, reject) => {
                    let completed = false;
                    const chunkReceipts = [];
                    const callback = (err: Error, receipt: any) => {
                        if (completed) return;
                        if (err || !receipt) {
                            completed = true;
                            reject(err);
                        }

                        chunkReceipts.push(err ? null : receipt);
                        if (chunkReceipts.length >= chunk.length) {
                            completed = true;
                            resolve(chunkReceipts);
                        }
                    };

                    if (chunk.length > 0) {
                        const batch = new Config.web3.BatchRequest();
                        chunk.forEach((tx: any) => {
                            batch.add(Config.web3.eth.getTransactionReceipt.request(tx, callback));
                        });
                        batch.execute();
                    } else {
                        resolve(chunkReceipts);
                    }
                });
            })

            return [].concat(...receipts);

        } catch (error) {
            winston.error(`Error getting receipt from transaction `, error)
            Promise.reject(error)
        }
    }

    public attachReceiptsToTransactions(transactions: any[], receipts: any[]) {
        if (transactions.length !== receipts.length) {
            winston.error(`Number of transactions not equal to number of receipts.`);
        }

        // compared to old version in TransactionParser, execution time improved from 10s to 5s
        const receiptMap = new Map<string, any>(
            receipts.map(r => [r.transactionHash, r] as [string, any])
        );
        const results: any = [];

        transactions.forEach((transaction) => {
            const receipt = receiptMap.get(transaction._id);
            results.push(this.mergeTransactionWithReceipt(transaction, receipt));
        });

        return Promise.resolve(results);
    }

    public updateTransactionsInDatabase(transactions: any) {
        const bulkTransactions = ERC721Transaction.collection.initializeUnorderedBulkOp();

        transactions.forEach((transaction: IExtractedTransaction) =>
            bulkTransactions.find({_id: transaction._id}).upsert().replaceOne(transaction)
        );

        if (bulkTransactions.length === 0) return Promise.resolve();

        return bulkTransactions.execute().then((bulkResult: any) => {
            return Promise.resolve(transactions);
        });
    }

    public extractDecodedLogsFromTransactions(transactions): Promise<any[]> {
        const promises = transactions.map((transaction) => {
            return new Promise((resolve) => {
                resolve(
                    this.extractDecodedLogsFromTransaction(transaction)
                );
            })
        })

        return Promise.all(promises).then((decodedLogs) => {
            return [].concat.apply([], decodedLogs);
        });
    }

    public extractDecodedLogsFromTransaction(transaction): any[] {
        const results = [];

        if (transaction.receipt.logs.length === 0 ) return results;

        const decodedLogs = this.abiDecoder.decodeLogs(transaction.receipt.logs).filter((log: any) => log);

        if (decodedLogs.length === 0) return results;

        decodedLogs.forEach((decodedLog: any) => {
            if (this.operationTypes.indexOf(decodedLog.name) >= 0) {
                results.push(decodedLog);
            }
        })

        return results;
    }

    public extractContractAddresses(transactions: any[]): Promise<any[]> {
            if (!transactions) return Promise.resolve([]);

            const contractAddresses: string[] = [];

            transactions.map((transaction) => {
                const decodedLogs = this.extractDecodedLogsFromTransaction(transaction);

                decodedLogs.forEach((decodedLog: any) => {
                    winston.debug(`ERC721Parser.extractContracts(), decodedLog.name: ${decodedLog.name}, transaction: ${transaction._id}, contract: ${decodedLog.address.toLowerCase()}`)
                    contractAddresses.push(decodedLog.address.toLowerCase());
                })
            });

            const uniqueContractAddresses = [...(new Set(contractAddresses))];

            return Promise.resolve(uniqueContractAddresses);
    }

    public getERC721Contracts(contractAddresses): Promise<any[]> {
        return Promise.all(
            this.getERC721ContractPromises(contractAddresses)
        ).then((contracts) => {
            return contracts.filter(function(c) { return c }); // filter out null and undefined
        });
    }

    public async getERC721Contract(contractAddress) {
        try {
            const contract = await this.getContractInstance(contractAddress, standardERC721ABI)

            if (contract.indexOf(undefined) != -1) {
                throw new Error()
            }

            winston.debug(`Successfully got ERC721 contract by address ${contractAddress}`)

            return {
                address: contractAddress,
                name: contract[0],
                symbol: contract[1],
                totalSupply: contract[2],
                implementsERC721: contract[3],
            }
        } catch (error) {
            winston.debug(`Error getting address ${contractAddress} as an ERC721 contract`, error)
            Promise.resolve()
        }
    }

    public updateTransactionOperationsInDatabase(transactionOperations: any[]): Promise<any[]> {
        return Promise.all(
            transactionOperations.map((transactionOperation) => {
                return this.updateTransactionOperationInDatabase(transactionOperation);
            })
        );
    }

    public updateERC721ContractsInDatabase(erc721Contracts: any[]): Promise<any[]> {
        return Promise.all(erc721Contracts.map((contract) =>  {
                return this.updateERC721ContractInDatabase(contract);
            })
        )
    }

    public updateERC721ContractInDatabase(erc721Contract: any): Promise<any> {
        erc721Contract.verified = this.isContractVerified(erc721Contract.address);
        erc721Contract.enabled = true;

        return ERC721Contract.findOneAndUpdate(
            {address: erc721Contract.address},
            erc721Contract,
            {new: true, upsert: true}
        ).exec().then((contract: any) => {
            return Promise.resolve(contract);
        }).catch((err: Error) => {
            winston.error(`ERC721Parser.updateDatabase(erc721Contract) error for contract ${erc721Contract}: ${err}`);
        });
    }

    public async parseTransactionOperations(transactions: ISavedTransaction[], contracts: IContract[]) {
        const rawTxOps = await this.parseRawTransactionOperations(transactions, contracts);
        const rawTxOpsFlat = [].concat.apply([], rawTxOps); // flatten [[1],[2]] to [1, 2]
        const rawTxOpsWithoutUndefined = rawTxOpsFlat.filter(function(e) { return e }); // remove undefined elements
        return rawTxOpsWithoutUndefined;
    }

    public parseRawTransactionOperations(transactions: ISavedTransaction[], contracts: IContract[]) {
        if (!transactions || !contracts) return Promise.resolve();

        return Bluebird.map(transactions, (transaction) => {
            const decodedLogs = this.extractDecodedLogsFromTransaction(transaction);

            if (decodedLogs.length > 0) {
                return Bluebird.mapSeries(decodedLogs, (decodedLog: IDecodedLog, index: number) => {
                    const contract = contracts.find((contract: IContract) => contract.address === decodedLog.address.toLowerCase());
                    if (contract) {
                        const transfer = this.parseEventLog(decodedLog);
                        return this.createOperationObject(transaction._id, index, transfer.from, transfer.to, transfer.value, decodedLog.name, contract._id);
                    }
                })

            }
        }).catch((err: Error) => {
            winston.error(`Could not parse transaction operations with error: ${err}`);
        });
    }

    public getContractName = async (contractAddress: string) => {
        try {
            const contractPromises = await this.getContractInstance(contractAddress, nameABI)
            const nameResults = await Bluebird.all(contractPromises).then((names: any) => {
                const name =  names.filter((name: any) => typeof name === "string" && name.length > 0)
                return name
            })
            let name = nameResults.length > 0 ? nameResults[0] : "";
            if (name.startsWith("0x")) {
                name = this.convertHexToAscii(name)
            }
            return name;
        } catch (error) {
            winston.error(`Error getting contract ${contractAddress} name`)
            Promise.resolve()
        }
    }

    public getContractOwnerOf = async (contractAddress: string, tokenId: string) => {
        try {
            const contractPromises = await this.getContractInstance(contractAddress, ownerOfABI, tokenId)
            const ownerResults = await Bluebird.all(contractPromises).then((owners: any) => {
                const owner =  owners.filter((owner: any) => typeof owner === "string" && owner.length > 0)
                return owner
            })
            return ownerResults.length > 0 ? ownerResults[0] : "";
        } catch (error) {
            winston.error(`Error getting ERC721 contract ${contractAddress} owner`)
            Promise.resolve()
        }
    }

    public getSavedTransactionsInDatabase(blockNumber: number): Promise<any[]> {
        return ERC721Transaction.find({blockNumber: {$eq: blockNumber}})
            .populate({
                path: "operations",
                populate: {
                    path: "contract",
                    model: "ERC721Contract"
                }
            });
    }

    public updateTokenOwnership(blockNumber) {
       return this.getSavedTransactionsInDatabase(blockNumber)
           .then(transactions => {
                const operations = this.createOperations(transactions)
                return this.completeBulk(this.createBulk(operations))
           }).catch((error: Error) => {
                winston.error(`Error parsing operations in block ${blockNumber}`, error)
           })
    }

    public createOperations(transactions: any[]): any[] {
        const operations: any = [];
        transactions.forEach(transaction => {
            transaction.operations.forEach((operation: any) => {
                operations.push({address: operation.to, contract: operation.contract._id})
                operations.push({address: operation.from, contract: operation.contract._id})
            })
        })
        return operations
    }

    // ###### private methods ######

    private scheduleNextParsing() {
        setDelay(100).then(() => {
            this.start()
        })
    }

    private saveLastParsedBlock(blockNumber: number, forward = true) {
        return LastParsedBlock.findOne({})
            .then((savedDoc) => {
                if (forward) {
                    if (blockNumber > savedDoc._doc.lastTokensBlockForERC721) {
                        return LastParsedBlock.findOneAndUpdate({}, {lastTokensBlockForERC721: blockNumber}, {upsert: true, new: true}).catch((err: Error) => {
                            winston.error(`Could not save lastTokensBlockForERC721 to DB with error: ${err}`);
                        });
                    }
                } else {
                    if (blockNumber < savedDoc._doc.lastTokensBackwardBlockForERC721) {
                        return LastParsedBlock.findOneAndUpdate({}, {lastTokensBackwardBlockForERC721: blockNumber}, {upsert: true, new: true}).catch((err: Error) => {
                            winston.error(`Could not save lastTokensBackwardBlockForERC721 to DB with error: ${err}`);
                        });
                    }
                }
            });
    }

    private getRawTransactions(block): any[] {
        return block.transactions;
    }

    private extractTransaction(block: IBlock, transaction: ITransaction) {
        const from = String(transaction.from).toLowerCase();
        const to: string = transaction.to === null ? "" : String(transaction.to).toLowerCase();
        const addresses: string[] = to ? [from, to] : [from];

        return {
            _id: String(transaction.hash),
            blockNumber: Number(transaction.blockNumber),
            timeStamp: String(block.timestamp),
            nonce: Number(transaction.nonce),
            from,
            to,
            value: String(transaction.value),
            gas: String(transaction.gas),
            gasPrice: String(transaction.gasPrice),
            gasUsed: String(0),
            input: String(transaction.input),
            addresses
        };
    }

    private mergeTransactionWithReceipt(transaction: any, receipt: any) {
        const newTransaction = transaction;
        newTransaction.gasUsed = receipt.gasUsed;
        newTransaction.receipt = receipt;
        newTransaction.contract = receipt.contractAddress ? receipt.contractAddress.toLowerCase() : null
        if (receipt.status) {
            newTransaction.error = receipt.status === "0x1" ? "" : "Error";
        }
        return newTransaction;
    }

    private completeBulk(bulk: any): Promise<any> {
        if (bulk.length > 0) {
            return bulk.execute().catch((err: Error) => {
                winston.error(`Could not update token with error: ${err}`);
            });
        } else {
            return Promise.resolve();
        }
    }

    private createBulk(operations: any) {
        const bulk = ERC721Token.collection.initializeUnorderedBulkOp();
        operations.forEach((operation: any) => {
            const contract = operation.contract
            const address = operation.address

            bulk.find({
                _id: address
            }).upsert().updateOne({
                "$setOnInsert": {
                    _id: address,
                    tokens: []
                }
            });

            bulk.find({
                _id: address,
                tokens: {
                    "$not": {
                        "$elemMatch": {
                            "$in": [contract]
                        }
                    }
                }
            }).updateOne({
                "$push": {
                    tokens: contract
                }
            });
        })
        return bulk
    }

    private updateTransactionOperationInDatabase(transactionOperation): Promise<ITransactionOperation[]> {
        return ERC721TransactionOperation.findOneAndUpdate({transactionId: transactionOperation.transactionId}, transactionOperation, {upsert: true, new: true})
            .then((operation: any) => {
                return ERC721Transaction.findOneAndUpdate({_id: transactionOperation.originalTransactionId}, {$addToSet: {operations: operation._id, addresses: {$each: [operation.to]}}})
                    .catch((error: Error) => {
                        winston.error(`Could not update operation and address to transactionID ${transactionOperation.transactionId} with error: ${error}`);
                    })
            }).catch((error: Error) => {
                winston.error(`Could not save transaction operation with error: ${error}`);
            })
    }

    private getERC721ContractPromises(contractAddresses) {
        return contractAddresses.map((contractAddress) => {
            return new Promise((resolve) => {
                this.getERC721Contract(contractAddress)
                    .then((contract) => {resolve(contract)});
            });
        });
    }

    private getIndexedOperation(transactionId: string, index: number): string {
        return `${transactionId}-${index}`.toLowerCase();
    }

    private createOperationObject(transactionId: string, index: number, from: string, to: string, value: string, type: string, contractId?: any): ITransactionOperation {
        return {
            originalTransactionId: transactionId,
            transactionId: this.getIndexedOperation(transactionId, index),
            type: type,
            from: from.toLocaleLowerCase(),
            to: to,
            value: value,
            contract: contractId,
        };
    }

    private parseEventLog(eventLog: any): {from: string, to: string, value: string} {
        return {
            from: eventLog.events[0].value,
            to: eventLog.events[1].value,
            value: removeScientificNotationFromNumbString(eventLog.events[2].value),
        }
    }

    private isContractVerified = (address: string): boolean => contracts[address] ? true : false;

    private convertHexToAscii(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    private getContractInstance = async (contractAddress, ABI, ... args: any[]) => {
        const contractPromise = Bluebird.map(ABI, async (abi: any) => {
            try {
                const contractInstance = new Config.web3.eth.Contract([abi], contractAddress);
                return await contractInstance.methods[abi.name](...args).call()
            } catch (error) {
                winston.debug(`Error getting ${contractAddress} as an ERC721 contract instance, method ${abi.name}\n${error}`)
                Promise.resolve()
            }
        })
        return contractPromise
    }
}