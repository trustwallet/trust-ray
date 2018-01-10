import * as winston from "winston";

import { ERC20Contract } from "../models/Erc20ContractModel";
import { Token } from "../models/TokenModel";
import { Config } from "./Config";
import { getTokenBalanceForAddress, loadContractABIs } from "./Utils";
import { TransactionOperation } from "../models/TransactionOperationModel";
import { NotParsableContracts } from "../models/NotParsableContractModel";


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
            if (
                (decodedInput && decodedInput.name === "transfer" && Array.isArray(decodedInput.params) && decodedInput.params.length === 2 && transaction.to !== null) ||
                (decodedInput && decodedInput.name === "mint" && Array.isArray(decodedInput.params) && decodedInput.params.length === 2 && transaction.to !== null)
            ) {
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

    /**
     * For each ABI that is currently stored, try to parse
     * the given contract with it. If any succeeds, update
     * database with given information.
     *
     * @param {String} contract
     * @returns {Promise<void>}
     */
    private getContract(contract: String): Promise<void> {
        return NotParsableContracts.findOne({address: contract}).exec().then((notParsableToken: any) => {

            if (notParsableToken) {
                return Promise.resolve(undefined);
            }

            const promises = [];
            for (const abi of this.abiList) {
                const contractInstance = new Config.web3.eth.Contract(abi, contract);

                const p1 = contractInstance.methods.name().call();
                const p2 = contractInstance.methods.totalSupply().call();
                const p3 = contractInstance.methods.decimals().call();
                const p4 = contractInstance.methods.symbol().call();

                promises.push(Promise.all([p1, p2, p3, p4]).then(([name, totalSupply, decimals, receivedSymbol]: any[]) => {
                    const symbol = this.convertSymbol(receivedSymbol)
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
                NotParsableContracts.findOneAndUpdate(
                    {address: contract},
                    {address: contract},
                    {upsert: true, new: true}
                ).then((npc: any) => {
                    winston.info(`Saved ${contract} to non-parsable contracts`);
                }).catch((err: Error) => {
                    winston.error(`Could not save non-parsable contract for ${contract}.`);
                });
            });
        });
    }

    private convertSymbol(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol);
        }
        return symbol;
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


    public getTokenBalances(address: string) {
        return TransactionOperation.find({
            "$or": [
                {to: address},
                {from: address}
            ]
        }).select("contract").exec().then((operations: any) => {
            const tokenContracts = this.extractTokenContracts(operations);
            const contractDetailsPromises = this.getContractDetails(tokenContracts);
            return Promise.all(contractDetailsPromises).then((tokens: any[]) => {
                const balancePromises: any = [];

                // get the balances
                tokens.map((token: any) => {
                    balancePromises.push(getTokenBalanceForAddress(address, token.address, token.decimals));
                });
                return Promise.all(balancePromises);
            });
        });
    }

    private extractTokenContracts(operations: any) {
        const tokenContracts: any = [];
        // extract tokens
        operations.map((operation: any) => {
            tokenContracts.push(operation.contract);
        });
        // remove duplicates
        return tokenContracts.reduce((a: any, b: any) => a.findIndex((e: any) => String(e) === String(b)) < 0
            ? [...a, b]
            : a, []);
    }

    private getContractDetails(tokenContracts: any) {
        const promises: any = [];
        tokenContracts.map((tokenContract: any) => {
            promises.push(ERC20Contract.findById(tokenContract).then((token: any) => {
                return {
                    address: token.address,
                    decimals: token.decimals
                }
            }));
        });
        return promises;
    }

    private performSingleTokenBalanceUpdate(address: string, contractAddress: string, updateVal: number, txId: string) {
        const bulk = Token.collection.initializeUnorderedBulkOp();

        // first try to upsert and set token
        bulk.find({
            address: address
        }).upsert().updateOne({
            "$setOnInsert": {
                tokens: [{
                    erc20Contract: contractAddress,
                    balance: updateVal,
                    transaction_history: [{
                        transaction: txId,
                        value: updateVal
                    }]
                }]
            }
        });

        // try to increment token balance if it exists
        bulk.find({
            address: address,
            tokens: {
                "$elemMatch": {
                    erc20Contract: contractAddress,
                    transaction_history: {
                        "$not": {
                            "$elemMatch": {
                                transaction: txId
                            }
                        }
                    }
                }
            }
        }).updateOne({
            "$inc": {
                "tokens.$.balance": updateVal
            },
            "$push": {
                "tokens.$.transaction_history": {
                    transaction: txId,
                    value: updateVal
                }
            }
        });

        // "push" new token to tokens array where it does not yet exist
        bulk.find({
            address: address,
            tokens: {
                "$not": {
                    "$elemMatch": {
                        erc20Contract: contractAddress
                    }
                }
            }
        }).updateOne({
            "$push": {
                tokens: {
                    erc20Contract: contractAddress,
                    balance: updateVal,
                    transaction_history: [{
                        transaction: txId,
                        value: updateVal
                    }]
                }
            }
        });

        // execute the bulk
        if (bulk.length > 0) {
            return bulk.execute().catch((err: Error) => {
                winston.error(`Could not update token balance for address ${address} and erc20 contract ${contractAddress} with error: ${err}`);
            });
        } else {
            return Promise.resolve();
        }
    }

    public updateTokenBalances(transactionOperations: any) {
        if (!transactionOperations) {
            return Promise.resolve(undefined);
        }
        const promises: any = [];
        transactionOperations.map((operation: any) => {
            promises.push(ERC20Contract.findById(operation.contract).exec().then((contract: any) => {

                // calculate the update value
                const balanceUpdateValue = Number(operation.value) / 10 ** contract.decimals;
                // update balance for sender and receiver
                promises.push(this.performSingleTokenBalanceUpdate(operation.from, operation.contract, balanceUpdateValue, operation.transactionId));
                promises.push(this.performSingleTokenBalanceUpdate(operation.to, operation.contract, -balanceUpdateValue, operation.transactionId));
            }));
        });

        return Promise.all(promises);
    }

}
