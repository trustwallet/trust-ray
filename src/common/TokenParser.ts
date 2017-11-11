import * as winston from "winston";

import { ERC20Contract } from "../models/erc20Contract.model";
import { Config } from "./config";

const erc20abi = require("./erc20abi");
const erc20ABIDecoder = require("abi-decoder");
erc20ABIDecoder.addABI(erc20abi);


export class TokenParser {

    private blacklistedContractAddresses: any = [];

    public parseERC20Contracts(transactions: any) {

        // extract  valid contracts
        let contractAddresses: any = [];
        transactions.map((transaction: any) => {
            const decodedInput = erc20ABIDecoder.decodeMethod(transaction.input);
            if (decodedInput && decodedInput.name === "transfer" && Array.isArray(decodedInput.params) && decodedInput.params.length == 2 && transaction.to !== null) {
                contractAddresses.push(transaction.to.toLowerCase());
            }
        });
        // remove duplicates
        contractAddresses = contractAddresses.filter((elem: any, pos: any, arr: any) => arr.indexOf(elem) == pos);
        // store new contracts
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
            if (!erc20contract && !this.blacklistedContractAddresses.includes(contractAddress)) {
                return this.getContract(contractAddress)
            } else {
                return Promise.resolve(erc20contract)
            }
        }).catch((err: Error) => {
            winston.error(`Could not find contract by id for ${contractAddress} with error: ${err}`);
        });
    }

    private getContract(contract: String): Promise<void> {
        const contractInstance = new Config.web3.eth.Contract(erc20abi, contract);

        const p1 = contractInstance.methods.name().call();
        const p2 = contractInstance.methods.totalSupply().call();
        const p3 = contractInstance.methods.decimals().call();
        const p4 = contractInstance.methods.symbol().call();

        return Promise.all([p1, p2, p3, p4]).then(([name, totalSupply, decimals, symbol]: any[]) => {
            return this.updateERC20Token(contract, {name, totalSupply, decimals, symbol});
        }).catch((err: Error) => {
            winston.error(`Could not parse input for contract ${contract} with error: ${err}.`);
            this.blacklistedContractAddresses.push(contract);
        });
    }

    private updateERC20Token(contract: String, obj: any): Promise<void> {
        return ERC20Contract.findOneAndUpdate({address: contract}, {
            address: contract,
            name: obj.name,
            totalSupply: obj.totalSupply,
            decimals: obj.decimals,
            symbol: obj.symbol
        }, {upsert: true, returnNewDocument: true}).then((res: any) => {
            return ERC20Contract.findOne({address: contract}).exec();
        })
    }

    private flatContracts(contracts: any) {
        // remove undefined contracts
        const flatUndefinedContracts =  contracts
            .map((contract: any) => (contract !== undefined)
                ? [contract]
                : [])
            .reduce( (a: any, b: any) => a.concat(b), [] );
        // remove duplicates
        return flatUndefinedContracts
            .reduce((a: any, b: any) => a.findIndex((e: any) => e.address == b.address) < 0
                ? [...a, b]
                : a, []);
    }

}