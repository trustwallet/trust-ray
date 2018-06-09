import * as winston from "winston";
import * as Bluebird from "bluebird";

import { loadContractABIs, removeScientificNotationFromNumbString } from "../Utils";
import { Config } from "../Config";
import { nameABI, ownerOfABI, standardERC721ABI } from "../abi/ABI";
import { ERC721Contract } from "../../models/Erc721ContractModel";
import { contracts } from "../tokens/contracts";
import { IContract, IDecodedLog, ISavedTransaction, ITransactionOperation } from "../CommonInterfaces";
import { TransactionOperation } from "../../models/TransactionOperationModel";
import { Transaction } from "../../models/TransactionModel";

export class ERC721Parser {
    private abiDecoder = require("abi-decoder");
    private abiList = loadContractABIs();

    private operationTypes = ["Transfer", "Approval", "approve"];

    private cachedContracts = {};

    constructor() {
        for (const abi of this.abiList) {
            this.abiDecoder.addABI(abi);
        }
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

    public updateDatabase(erc721Contracts: any[]): Promise<any[]> {
        return Promise.all(erc721Contracts.map((contract) =>  {
                return this.updateContractRecord(contract);
            })
        )
    }

    public updateContractRecord(erc721Contract: any): Promise<any> {
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

    // ###### private methods ######

    private getERC721ContractPromises(contractAddresses) {
        return contractAddresses.map((contractAddress) => {
            return new Promise((resolve) => {
                this.getERC721Contract(contractAddress)
                    .then((contract) => {resolve(contract)});
            });
        });
    }

    private findOrCreateTransactionOperation(transactionId: string, index: number, from: string, to: string, value: string, erc20ContractId?: any): Promise<ITransactionOperation[]> {

        const operation = this.createOperationObject(transactionId, index, from, to, value, erc20ContractId);
        const indexedOperation = this.getIndexedOperation(transactionId, index);

        return TransactionOperation.findOneAndUpdate({transactionId: indexedOperation}, operation, {upsert: true, new: true})
            .then((operation: any) => {
                return Transaction.findOneAndUpdate({_id: transactionId}, {$push: {operations: operation._id, addresses: {$each: [operation.to]}}})
                    .catch((error: Error) => {
                        winston.error(`Could not update operation and address to transactionID ${transactionId} with error: ${error}`);
                    })
            }).catch((error: Error) => {
                winston.error(`Could not save transaction operation with error: ${error}`);
            })
    }

    private getIndexedOperation(transactionId: string, index: number): string {
        return `${transactionId}-${index}`.toLowerCase();
    }

    private createOperationObject(transactionId: string, index: number, from: string, to: string, value: string, type: string, contractID?: any): ITransactionOperation {
        return {
            transactionId: this.getIndexedOperation(transactionId, index),
            type: type,
            from: from.toLocaleLowerCase(),
            to: to,
            value: value,
            contract: contractID,
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