import * as winston from "winston";
import { ERC20Contract } from "../models/Erc20ContractModel";
import { Config } from "./Config";
import { getTokenBalanceForAddress, loadContractABIs } from "./Utils";
import { TransactionOperation } from "../models/TransactionOperationModel";
import { NotParsableContracts } from "../models/NotParsableContractModel";
import { Transaction } from "../models/TransactionModel";
import * as BluebirdPromise from "bluebird";
import { contracts } from "./tokens/contracts";
import { nameABI, symbolABI, decimalsABI, totalSupplyABI, standartERC20ABI } from "./abi/ABI";
const flattenDeep = require("lodash.flattendeep");

export class TokenParser {
    private abiDecoder = require("abi-decoder");
    private abiList = loadContractABIs();
    private OperationTypes = {
        Transfer: "Transfer",
    }

    private cachedContracts = {}

    constructor() {
        for (const abi of this.abiList) {
            this.abiDecoder.addABI(abi);
        }
    }

    public parseERC20Contracts(transactions: any) {
        if (!transactions) return Promise.resolve([undefined, undefined]);

        const contractAddresses: string[] = [];

        transactions.map((transaction: any) => {
            if (transaction.receipt.logs.length === 0 ) return;

            const decodedLogs = this.abiDecoder.decodeLogs(transaction.receipt.logs).filter((log: any) => log);

            if (decodedLogs.length === 0) return;

            decodedLogs.forEach((decodedLog: any) => {
                if (decodedLog.name === this.OperationTypes.Transfer) {
                    contractAddresses.push(decodedLog.address.toLowerCase());
                }
            })
        });

        const uniqueContracts = [...(new Set(contractAddresses))];
        const promises = uniqueContracts.map((contractAddress: any) => this.findOrCreateERC20Contract(contractAddress));

        return Promise.all(promises).then((contracts: any) => [transactions, this.flatContracts(contracts)])
            .catch((err: Error) => {
                winston.error(`Could not parse erc20 contracts with error: ${err}`);
            });
    }

    private findOrCreateERC20Contract(contractAddress: string): Promise<void> {
        if (this.cachedContracts.hasOwnProperty(contractAddress)) {
            return Promise.resolve(this.cachedContracts[contractAddress]);
        }
        const isContractVerified: boolean = this.isContractVerified(contractAddress);
        const options = {new: true};
        return ERC20Contract.findOneAndUpdate({address: contractAddress}, {$set: {verified: isContractVerified}}, options).exec().then((erc20contract: any) => {
            if (!erc20contract) {
                return this.getContract(contractAddress);
            } else {
                this.cachedContracts[contractAddress] = erc20contract
                return Promise.resolve(erc20contract);
            }
        }).catch((err: Error) => {
            winston.error(`Could not find contract by id for ${contractAddress} with error: ${err}`);
        });
    }

    public getContract = async (contract: string) => {
        try {
            const notParsableToken = await NotParsableContracts.findOne({address: contract})
            if (notParsableToken) { Promise.resolve() }

            const isContractVerified: boolean = this.isContractVerified(contract)
            const erc20Contract = await this.getERC20Contract(contract)

            if (erc20Contract) {
                const decimal = erc20Contract[2];
                const supply = erc20Contract[3]
                const name: string = erc20Contract[0]
                const symbol: string = erc20Contract[1]
                const decimals: string = decimal
                const totalSupply: string = supply
                const updatedERC20 = await this.updateERC20Token(contract, name, symbol, decimals, totalSupply, isContractVerified)
                return updatedERC20
            }

            const p1 = await this.getContractName(contract)
            const p2 = await this.getContractSymbol(contract)
            const p3 = await this.getContractDecimals(contract)
            const p4 = await this.getContractTotalSupply(contract)

            const [name, symbol, decimals, totalSupply] = await Promise.all([p1, p2, p3, p4])
            const updateERC20Token = await this.updateERC20Token(contract, name, symbol, decimals, totalSupply, isContractVerified)

            return updateERC20Token;
        } catch (error) {
            winston.error(`Could not get contract ${contract} with error ${error}`)
            const updateNotParsableContract = await this.updateNotParsableContract(contract)
            return updateNotParsableContract
        }
    }

    public getERC20Contract = async (contractAddress) => {
        try {
            const contract = await this.getContractInstance(contractAddress, standartERC20ABI)
            if (contract.indexOf(undefined) != -1) {
                throw new Error()
            }
            return contract
        } catch (error) {
            winston.error(`Error getting standart ERC20 ${contractAddress} `, error)
            Promise.resolve()
        }
    }

    public getContractInstance = async (contractAddress, ABI) => {
            const contractPromise = BluebirdPromise.map(ABI, async (abi: any) => {
                try {
                    const contractInstance = new Config.web3.eth.Contract([abi], contractAddress);
                    const value = await contractInstance.methods[abi.name]().call()
                    return value;
                } catch (error) {
                    winston.error(`Error getting contract ${contractAddress} instance method ${abi.name}`, error)
                    Promise.resolve()
                }
            })
            return contractPromise
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
             winston.error(`Error getting contract ${contractAddress} name`, error)
            Promise.resolve()
        }
    }

    public getContractSymbol = async (contractAddress: string) => {
        try {
            const symbolPromises = await this.getContractInstance(contractAddress, symbolABI)
            const nameResults = await BluebirdPromise.all(symbolPromises).then((symbols: any) => {
              return symbols.filter((res: any) => typeof res === "string" && !res.startsWith("0x0") ? true : false)
            })
            let name = nameResults.length > 0 ? nameResults[0] : "";
            if (name.startsWith("0x")) {
              name = this.convertHexToAscii(name)
          }
            return name;
        } catch (error) {
             winston.error(`Error getting contract ${contractAddress} symbol value`, error)
            Promise.resolve()
        }
    }

    public getContractDecimals = async (contractAddress: string) => {
        try {
            const decimalPromises = await this.getContractInstance(contractAddress, decimalsABI)
            const nameResults = await BluebirdPromise.all(decimalPromises).then((decimals: any) => {
              return decimals
            })
            const decimal = nameResults.length > 0 ? nameResults[0] : Promise.reject(nameResults);
            return decimal;
        } catch (error) {
             winston.error(`Error getting contract ${contractAddress} decimal value`, error)
            Promise.resolve()
        }
    }

    public getContractTotalSupply = async (contractAddress: string) => {
        try {
            const totalSupplyPromises = await this.getContractInstance(contractAddress, totalSupplyABI)
            const nameResults = await BluebirdPromise.all(totalSupplyPromises).then((totalSupplies: any) => {
              return totalSupplies.filter((res: any) => typeof res === "string" && !res.startsWith("0x0") ? true : false)
            })
            let name = nameResults.length > 0 ? nameResults[0] : "";
            if (name.startsWith("0x")) {
              name = this.convertHexToAscii(name)
          }
            return name;
        } catch (error) {
             winston.error(`Error getting contract totalSupply ${contractAddress} value`, error)
            Promise.resolve()
        }
    }

    public convertHexToAscii(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    public isContractVerified = (address: string): boolean => contracts[address] ? true : false;

    private convertSymbol(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    private async updateERC20Token(address: string, name: string, symbol: string, decimal: string, totalSupply: string, isContractVerified: boolean) {
        try {
            const update = await ERC20Contract.findOneAndUpdate({address}, {
                address,
                name,
                symbol,
                decimals: decimal,
                totalSupply,
                verified: isContractVerified
            }, {upsert: true, new: true})

            return update
        } catch (error) {
            winston.error(`Error updating ERC20 token`, error)
            return Promise.reject(error)
        }
    }

    private async updateNotParsableContract(address: string) {
        try {
            await NotParsableContracts.findOneAndUpdate({address}, {address}, {upsert: true, new: true}).then((savedNonParsable: any) => {
                winston.info(`Saved ${savedNonParsable} to non-parsable contracts`)
            })
        } catch (error) {
            winston.error(`Could not save non-parsable contract ${address} with error`, error);
            return Promise.reject(error)
        }
    }

    private flatContracts(contracts: any) {
        // remove undefined contracts
        const flatUndefinedContracts =  contracts
            .map((contract: any) => (contract !== undefined && contract !== null)
                ? [contract]
                : [])
            .reduce( (a: any, b: any) => a.concat(b), [] );
        // remove duplicates
        return flatUndefinedContracts
            .reduce((a: any, b: any) => a.findIndex((e: any) => e.address == b.address) < 0
                ? [...a, b]
                : a, []);
    }


    public async getTokenBalances(address: string) {
        const addressOperations = await this.getOperationstionsByAddress(address);
        const flattenOperations = flattenDeep(addressOperations);
        const tokenContracts: any[] = this.extractTokenContracts(flattenOperations);
        const contractDetails: any = await this.getContractDetails(tokenContracts);

        return BluebirdPromise.map(contractDetails, (contract: any) => {
            return this.getTokenBalance(address, contract.address).then((balance: string) => {
                return {
                    balance,
                    contract: {
                        address: contract.address,
                        name: contract.name,
                        symbol: contract.symbol,
                        decimals: contract.decimals,
                    }
                }
            });
        });
    }

    public getTokenBalance(address: string, contractAddress: string) {
        const tokenAddress: string = address.substring(2);
        const getBalanceSelector: string = Config.web3.utils.sha3("balanceOf(address)").slice(0, 10);

        return Config.web3.eth.call({
            to: contractAddress,
            data: `${getBalanceSelector}000000000000000000000000${tokenAddress}`
        }).then((balance: string) => Config.web3.utils.toBN(balance).toString()
        ).catch((error: Error) => {
            winston.info("Error getting token balance ", error);
        });
    }

    private getOperationstionsByAddress(address: string) {
        return Transaction.find({"addresses": {$in: [address]}})
            .populate({
                path: "operations",
                model: "TransactionOperation",
                match: {$or: [
                                {to: {$eq: address}},
                                {from: {$eq: address}}
                            ]},
                populate: {
                    path: "contract",
                    model: "ERC20Contract",
                }
            }).exec().then((transactions: any) => transactions.map((transaction: any) => transaction.operations))
            .catch((error: Error) => {
                winston.error(`Error getting operations by address ${error}`)
            });
    }

    private extractTokenContracts(operations: any) {
        const tokenContracts: string[] = [];
        // extract tokens
        operations.map((operation: any) => {
            tokenContracts.push(operation.contract.address);
        });
        // remove duplicates
        return tokenContracts.reduce((a: any, b: any) => a.findIndex((e: any) => String(e) === String(b)) < 0
            ? [...a, b]
            : a, []);
    }

    private getContractDetails(contracts: string[]) {
        return BluebirdPromise.map(contracts, (contract: string) => {
            const contractPromise = ERC20Contract.findOne({address: contract}).exec();

            return contractPromise.then((contract: any) => {
                return {
                    address: contract.address,
                    symbol: contract.symbol,
                    decimals: contract.decimals,
                    name: contract.name,
                }
            }).catch((error: Error) => {
                winston.error(`Can not find ERC20 contract by address`, error);
            });
        });
    }
}