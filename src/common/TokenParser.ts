import * as winston from "winston";

import { ERC20Contract } from "../models/Erc20ContractModel";
import { Token } from "../models/TokenModel";
import { Config } from "./Config";
import { loadContractABIs } from "./Utils";


export class TokenParser {

    private abiList = loadContractABIs();
    private abiDecoder = require("abi-decoder");

    constructor() {
        for (const abi of this.abiList) {
            this.abiDecoder.addABI(abi);
        }
    }

    public parseERC20Contracts(transactions: any) {
        if (!transactions) {
            return Promise.resolve([undefined, undefined]);
        }

        // extract  valid contracts
        let contractAddresses: any = [];
        transactions.map((transaction: any) => {
            const decodedInput = this.abiDecoder.decodeMethod(transaction.input);
            if (decodedInput && decodedInput.name === "transfer" && Array.isArray(decodedInput.params) && decodedInput.params.length == 2 && transaction.to !== null) {
                contractAddresses.push(transaction.to.toLowerCase());
            }
        });
        // remove duplicates
        contractAddresses = contractAddresses.filter((elem: any, pos: any, arr: any) => arr.indexOf(elem) == pos);
        // process contracts
        const promises = contractAddresses.map((contractAddress: any) => {
            return this.findOrCreateERC20Contract(contractAddress);
        });
        return Promise.all(promises).then((contracts: any) => {
            return [transactions, this.flatContracts(contracts)];
        }).catch((err: Error) => {
            winston.error(`Could not parse erc20 contracts with error: ${err}`);
        });
    }

    private findOrCreateERC20Contract(contractAddress: String): Promise<void> {
        return ERC20Contract.findOne({address: contractAddress}).exec().then((erc20contract: any) => {
            if (!erc20contract) {
                return this.getContract(contractAddress);
            } else {
                return Promise.resolve(erc20contract);
            }
        }).catch((err: Error) => {
            winston.error(`Could not find contract by id for ${contractAddress} with error: ${err}`);
        });
    }

    private getContract(contract: String): Promise<void> {
        const promises = [];
        for (const abi of this.abiList) {
            const contractInstance = new Config.web3.eth.Contract(abi, contract);

            const p1 = contractInstance.methods.name().call();
            const p2 = contractInstance.methods.totalSupply().call();
            const p3 = contractInstance.methods.decimals().call();
            const p4 = contractInstance.methods.symbol().call();

            promises.push(Promise.all([p1, p2, p3, p4]).then(([name, totalSupply, decimals, symbol]: any[]) => {
                return [name, totalSupply, decimals, symbol];
            }).catch((err: Error) => {
               /* don't do anything here, but catch error */
            }));
        }

        return Promise.all(promises).then((contracts: any[]) => {
            const contractObj = contracts.filter((ele: any) => { return ele !== undefined })[0];
            return this.updateERC20Token(contract, {
                name: contractObj[0],
                totalSupply: contractObj[1],
                decimals: contractObj[2],
                symbol: contractObj[3]
            });
        }).catch((err: Error) => {
            winston.error(`Could not parse input for contract ${contract}.`);
        });
    }

    private updateERC20Token(contract: String, obj: any): Promise<void> {
        return ERC20Contract.findOneAndUpdate({address: contract}, {
            address: contract,
            name: obj.name,
            totalSupply: obj.totalSupply,
            decimals: obj.decimals,
            symbol: obj.symbol
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

    public updateTokenBalances(transactionOperations: any) {
        if (!transactionOperations) {
            return Promise.resolve(undefined);
        }
        const promises: any = [];

        transactionOperations.map((operation: any) => {
            const bulk = Token.collection.initializeUnorderedBulkOp();

            // first try to upsert and set token
            bulk.find({
                address: operation.from
            }).upsert().updateOne({
                "$setOnInsert": {
                    tokens: [{
                        erc20Contract: operation.contract,
                        balance:  Number(operation.value)
                    }]
                }
            });

            // try to increment token balance if it exists
            bulk.find({
                address: operation.from,
                tokens: {
                    "$elemMatch": {
                        erc20Contract: operation.contract
                    }
                }
            }).updateOne({
                "$inc": { "tokens.$.balance": Number(operation.value)}
            });

            // "push" new token to tokens array where it does not yet exist
            bulk.find({
                address: operation.from,
                tokens: {
                    "$not": {
                        "$elemMatch": {
                            erc20Contract: operation.contract
                        }
                    }
                }
            }).updateOne({
                "$push": {
                    tokens: {
                        erc20Contract: operation.contract,
                        balance: operation.value
                    }
                }
            });

            if (bulk.length > 0) {
                const p = bulk.execute().catch((err: Error) => {
                    winston.error(`Could not update token balance for address ${operation.from} and erc20 contract ${operation.contract} with error: ${err}`);
                });
                promises.push(p);
            } else {
                promises.push(Promise.resolve());
            }
        });

        return Promise.all(promises);
    }



}