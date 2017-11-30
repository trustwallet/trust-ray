import { Response } from "express";
import * as winston from "winston";
import { Config } from "./Config";
const axios = require("axios");

/**
 * Fills the status and JSOn data into a response object.
 * @param res response object
 * @param status of the response
 * @param content of the response
 */
export function sendJSONresponse(res: Response, status: number, content: any) {
    res.status(status);
    res.json(content);
}

/**
 * Converts a number given as string containing scientific
 * notation to regular number, e.g.:
 * 1.105898485e+22 to 11058984850000000000000
 *
 * @param {string} numberString
 * @returns {string}
 */
export function removeScientificNotationFromNumbString(numberString: string) {
    const numb = +numberString;
    const data = String(numb).split(/[eE]/);

    if (data.length == 1)
        return data[0];

    let z = "";
    const sign = numb < 0 ? "-" : "";
    const str = data[0].replace(".", "");
    let mag = Number(data[1]) + 1;

    if (mag < 0) {
        z = sign + "0.";
        while (mag++)
            z += "0";
        return z + str.replace(/^\-/, "");
    }
    mag -= str.length;
    while (mag--)
        z += "0";
    return str + z;
}

/**
 * Loads all ABIs currently stored in {root}/common/contracts/
 * and pushes them into a list that is then returned.
 *
 * @returns {any}
 */
export function loadContractABIs() {
    const dstList: any = [];
    const path = require("path");
    const normalizedPath = path.join(__dirname, "contracts");
    require("fs").readdirSync(normalizedPath).forEach(function(file: any) {
        if (path.extname(file) === ".js") {
            const abi = require(path.join(normalizedPath, file));
            dstList.push(abi);
        }
    });
    return dstList;
}

/**
 * Fetches ABI for a contract
 * from the etherscan API.
 *
 * @param contract
 */
export function fetchAbiFromEtherscan(contract: any) {
    const URL = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contract}&apikey=YourApiKeyToken`;
    return axios.get(URL).then((response: any) => {
        if (response.data.message === "OK") {
            return response.data.result;
        }
    }).catch((err: any) => {
        winston.error(`Error while fetching contract ${contract} from etherscan with error: ${err}`);
    });
}

/**
 * Get balance for a given address for a given contract.
 *
 * @param {string} address
 * @param {string} contractAddress
 */
export function getTokenBalanceForAddress(address: string, contractAddress: string) {
    const abi = require("./contracts/Erc20Abi");
    const contractInstance = new Config.web3.eth.Contract(abi, contractAddress);
    return contractInstance.methods.balanceOf(address).call();
}


/**
 * Sets delay for given amount of time.
 *
 * @param {number} t
 * @returns {Promise<any>}
 */
export function setDelay(t: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, t);
    });
}
