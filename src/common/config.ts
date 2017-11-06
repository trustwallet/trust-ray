const Web3 = require("web3");

export class Config {
        static network = process.env.RPC_SERVER;
        static web3 = new Web3(new Web3.providers.HttpProvider(Config.network));
}