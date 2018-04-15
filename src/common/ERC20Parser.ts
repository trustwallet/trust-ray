import * as winston from "winston";
import { Config } from "./Config";
import * as BluebirdPromise from "bluebird";
import { nameABI, symbolABI, decimalsABI, totalSupplyABI, standartERC20ABI } from "./abi/ABI";

export class ERC20Parser {

    public convertHexToAscii(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    public getERC20Contract = async (contractAddress) => {
        try {
            const contract = await this.getContractInstance(contractAddress, standartERC20ABI)
            if (contract.indexOf(undefined) != -1) {
                throw new Error()
            }
            return {
                name: contract[0],
                symbol: contract[1],
                decimals: contract[2],
                totalSupply: contract[3],
            }
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
                    winston.error(`Error getting contract ${contractAddress} instance method ${abi.name}`)
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
             winston.error(`Error getting contract ${contractAddress} name`)
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
             winston.error(`Error getting contract ${contractAddress} symbol value`)
            Promise.resolve()
        }
    }

    public getContractDecimals = async (contractAddress: string) => {
        try {
            const decimalPromises = await this.getContractInstance(contractAddress, decimalsABI)
            const decimalsResults = await BluebirdPromise.all(decimalPromises)

            const decimal = decimalsResults.length > 0 ? Math.max(...decimalsResults).toString() : Promise.reject(decimalsResults);
            return decimal;
        } catch (error) {
             winston.error(`Error getting contract ${contractAddress} decimal value`)
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
             winston.error(`Error getting contract totalSupply ${contractAddress} value`)
            Promise.resolve()
        }
    }
}