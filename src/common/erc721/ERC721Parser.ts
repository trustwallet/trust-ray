import * as winston from "winston";
import * as BluebirdPromise from "bluebird";

import { loadContractABIs } from "../Utils";
import { Config } from "../Config";
import { nameABI, ownerOfABI, standardERC721ABI } from "../abi/ABI";
import { ERC721Contract } from "../../models/Erc721ContractModel";
import { contracts } from "../tokens/contracts";

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

    public extractContracts(transactions: any[]): Promise<any[]> {
            if (!transactions) return Promise.resolve([]);

            const contractAddresses: string[] = [];

            transactions.map((transaction: any) => {
                const decodedLogs = this.extractDecodedLogsFromTransaction(transaction);

                decodedLogs.forEach((decodedLog: any) => {
                    winston.info(`ERC721Parser.extractContracts(), decodedLog.name: ${decodedLog.name}, transaction: ${transaction._id}, contract: ${decodedLog.address.toLowerCase()}`)
                    contractAddresses.push(decodedLog.address.toLowerCase());
                })
            });

            const uniqueContractAddresses = [...(new Set(contractAddresses))];

            return Promise.resolve(uniqueContractAddresses);
    }

    public getERC721Contract = async (contractAddress) => {
        try {
            const contract = await this.getContractInstance(contractAddress, standardERC721ABI)

            if (contract.indexOf(undefined) != -1) {
                throw new Error()
            }

            winston.info(`Successfully got ERC721 contract ${contractAddress}`)

            return {
                address: contractAddress,
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

    public getContractName = async (contractAddress: string) => {
        try {
            const contractPromises = await this.getContractInstance(contractAddress, nameABI)
            const nameResults = await BluebirdPromise.all(contractPromises).then((names: any) => {
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
            const ownerResults = await BluebirdPromise.all(contractPromises).then((owners: any) => {
                const owner =  owners.filter((owner: any) => typeof owner === "string" && owner.length > 0)
                return owner
            })
            return ownerResults.length > 0 ? ownerResults[0] : "";
        } catch (error) {
            winston.error(`Error getting ERC721 contract ${contractAddress} owner`)
            Promise.resolve()
        }
    }

    public updateDatabase(erc721Contract): Promise<any> {
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

    // ###### private methods ######

    private isContractVerified = (address: string): boolean => contracts[address] ? true : false;

    private convertHexToAscii(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    private getContractInstance = async (contractAddress, ABI, ... args: any[]) => {
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
}