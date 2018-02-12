const Web3 = require("web3");
const config = require("config");

export class Config {
        static network = config.get("RPC_SERVER");
        static web3 = new Web3(new Web3.providers.HttpProvider(Config.network));
}
