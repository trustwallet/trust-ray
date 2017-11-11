const Web3 = require("web3");

export class Config {
        static network = "https://mainnet.infura.io/Q0JZYALyx5RUUxsikR2j";
        static web3 = new Web3(new Web3.providers.HttpProvider(Config.network));
}