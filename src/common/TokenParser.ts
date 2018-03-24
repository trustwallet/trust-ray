import * as winston from "winston";
import { ERC20Contract } from "../models/Erc20ContractModel";
import { Config } from "./Config";
import { getTokenBalanceForAddress, loadContractABIs } from "./Utils";
import { TransactionOperation } from "../models/TransactionOperationModel";
import { NotParsableContracts } from "../models/NotParsableContractModel";
import { Transaction } from "../models/TransactionModel";
import * as BluebirdPromise from "bluebird";
import { contracts } from "./tokens/contracts";
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

    /**
     * For each ABI that is currently stored, try to parse
     * the given contract with it. If any succeeds, update
     * database with given information.
     *
     * @param {String} contract
     * @returns {Promise<void>}
     */
    private getContract(contract: string): Promise<void> {
        return NotParsableContracts.findOne({address: contract}).exec().then((notParsableToken: any) => {
            if (notParsableToken) return Promise.resolve(undefined);
            const promises = [];

            for (const abi of this.abiList) {
                const contractInstance = new Config.web3.eth.Contract(abi, contract);

                const p1 = contractInstance.methods.name().call();
                const p2 = contractInstance.methods.totalSupply().call();
                const p3 = contractInstance.methods.decimals().call();
                const p4 = contractInstance.methods.symbol().call();

                promises.push(Promise.all([p1, p2, p3, p4]).then(([name, totalSupply, decimals, receivedSymbol]: string[]) => {
                    const symbol = this.convertSymbol(receivedSymbol);
                    return [name, totalSupply, decimals, symbol];
                }).catch((error: Error) => {
                    winston.error(`Failed to get contract ${contract} object with error ${error}`);
                }));
            }

            return Promise.all(promises).then((contracts: any[]) => {
                const contractObj = contracts.filter((ele: any) => ele !== undefined )[0];
                const isContractVerified: boolean = this.isContractVerified(contract);

                return this.updateERC20Token(contract, {
                    name: contractObj[0],
                    totalSupply: contractObj[1],
                    decimals: contractObj[2],
                    symbol: contractObj[3],
                    verified: isContractVerified
                });
            }).catch((error: Error) => {
                winston.error(`Could not parse input for contract ${contract} with error ${error}`);
                NotParsableContracts.findOneAndUpdate(
                    {address: contract},
                    {address: contract},
                    {upsert: true, new: true}
                ).then(() => {
                    winston.info(`Saved ${contract} to non-parsable contracts`);
                }).catch((err: Error) => {
                    winston.error(`Could not save non-parsable contract for ${contract}.`);
                });
            });
        });
    }

    public isContractVerified = (address: string): boolean => contracts[address] ? true : false;

    private convertSymbol(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    private updateERC20Token(contract: String, obj: any): Promise<void> {
        return ERC20Contract.findOneAndUpdate({address: contract}, {
            address: contract,
            name: obj.name,
            totalSupply: obj.totalSupply,
            decimals: obj.decimals,
            symbol: obj.symbol,
            verified: obj.verified
        }, {upsert: true, new: true}).then((savedToken: any) => savedToken);
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

    private getTokenBalance(address: string, contractAddress: string) {
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