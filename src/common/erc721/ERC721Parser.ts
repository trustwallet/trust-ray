import * as winston from "winston";
import * as BluebirdPromise from "bluebird";

import { loadContractABIs } from "../Utils";
import { Config } from "../Config";
import { nameABI, ownerOfABI, standardERC721ABI } from "../abi/ABI";

export class ERC721Parser {
    private abiDecoder = require("abi-decoder");
    private abiList = loadContractABIs();

    private operationTypes = ["Transfer", "Approval", "approve"];

    constructor() {
        for (const abi of this.abiList) {
            this.abiDecoder.addABI(abi);
        }
    }

    public extractContracts(transactions: any[]): Promise<any[]> {
            if (!transactions) return Promise.resolve([]);

            const contractAddresses: string[] = [];

            transactions.map((transaction: any) => {
                if (transaction.receipt.logs.length === 0 ) return;

                const decodedLogs = this.abiDecoder.decodeLogs(transaction.receipt.logs).filter((log: any) => log);

                if (decodedLogs.length === 0) return;

                decodedLogs.forEach((decodedLog: any) => {
                    if (this.operationTypes.indexOf(decodedLog.name) >= 0) {
                        winston.info(`ERC721Parser.extractContracts(), decodedLog.name: ${decodedLog.name}, transaction: ${transaction._id}, contract: ${decodedLog.address.toLowerCase()}`)
                        contractAddresses.push(decodedLog.address.toLowerCase());
                    }
                })
            });

            const uniqueContractAddresses = [...(new Set(contractAddresses))];

            return Promise.resolve(uniqueContractAddresses);
    }

    public convertHexToAscii(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    public getERC721Contract = async (contractAddress) => {
        try {
            const contract = await this.getContractInstance(contractAddress, standardERC721ABI)

            if (contract.indexOf(undefined) != -1) {
                throw new Error()
            }

            winston.info(`Successfully got ERC721 contract ${contractAddress}`)

            return {
                name: contract[0],
                symbol: contract[1],
                totalSupply: contract[2],
                implementsERC721: contract[3],
            }
        } catch (error) {
            winston.error(`Error getting ${contractAddress} as an ERC721 contract`, error)
            Promise.resolve()
        }
    }

    public getContractInstance = async (contractAddress, ABI, ... args: any[]) => {
        const contractPromise = BluebirdPromise.map(ABI, async (abi: any) => {
            try {
                const contractInstance = new Config.web3.eth.Contract([abi], contractAddress);
                return await contractInstance.methods[abi.name](...args).call()
            } catch (error) {
                winston.error(`Error getting ${contractAddress} as an ERC721 contract instance, method ${abi.name}\n${error}`)
                Promise.resolve()
            }
        })
        return contractPromise
    }

    /*
    public parse(block) {
        const transactions = this.parseTransactionsInBlock(block);
        const erc721Contracts = this.parseERC721ContractsFromTransactions(transactions);
        this.updateDatabase(transactions, erc721Contracts);
    }

    public parseTransactionsInBlock(block) {
        const transactions = this.extractTransactionsFromBlock(block);
        const receipts = this.fetchReceiptsFromTransactions(transactions);
        const mergedTransactions = this.mergeTransactionsAndReceipts(transactions, receipts);
        return Promise.resolve(mergedTransactions);
    }
    */
}