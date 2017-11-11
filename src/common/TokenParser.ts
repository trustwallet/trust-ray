import * as winston from "winston";

import { ERC20Contract } from "../models/erc20Contract.model";
import { Config } from "./config";

const erc20abi = require("./erc20abi");
const erc20ABIDecoder = require("abi-decoder");
erc20ABIDecoder.addABI(erc20abi);


export class TokenParser {

    private blacklistedContractAddresses: any = [];

    public parseERC20Contracts(transactions: any) {
        const contractPromises: any = [];
        transactions.map((transaction: any) => {
            const decodedInput = erc20ABIDecoder.decodeMethod(transaction.input);
            if (decodedInput && decodedInput.name === "transfer" && Array.isArray(decodedInput.params) && decodedInput.params.length == 2 && transaction.to !== null) {
                const contract = transaction.to.toLowerCase();
                if (!this.blacklistedContractAddresses.includes(contract)) {
                    const p = this.findOrCreateERC20Contract(contract).catch((err: Error) => {
                        winston.error(`Could not find contract by id for ${contract} with error: ${err}`);
                    });
                    contractPromises.push(p);
                }
            }
        });
        return Promise.all(contractPromises).then((contracts: any) => {
            return [transactions, this.flatUndefinedContracts(contracts)];
        }).catch((err: Error) => {
            winston.error(`Could not parse erc20 contracts with error: ${err}`);
        });
    }

    private findOrCreateERC20Contract(contract: String): Promise<void> {
        return ERC20Contract.findOne({address: contract}).exec().then((erc20contract: any) => {
            if (!erc20contract) {
                return this.getContract(contract)
            } else {
                return Promise.resolve(erc20contract)
            }
        })
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

    private flatUndefinedContracts(contracts: any) {
        return contracts
            .map((contract: any) => (contract !== undefined)
                ? [contract]
                : [])
            .reduce( (a: any, b: any) => a.concat(b), [] );
    }

}