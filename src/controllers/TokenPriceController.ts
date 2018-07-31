import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import * as winston from "winston";
import * as BluebirbPromise from "bluebird";
import { IToken, IPrice } from "./Interfaces/ITokenPriceController";
import { contracts } from "../common/tokens/contracts";

const CoinMarketCap = require("coinmarketcap-api");

export class TokenPriceController {
    private client = new CoinMarketCap();
    private refreshLimit = 600;
    private lastUpdated: any = {};
    private latestPrices: any = {};
    private isUpdating: any = {};
    private githubImageURL: string = "https://raw.githubusercontent.com/TrustWallet/tokens/master/images/";

    getTokenPrices = (req: Request, res: Response) => {
        const currency = req.body.currency || "USD";
        const tokens = req.body.tokens;

        this.getRemotePrices(currency).then((prices: any) => {
            sendJSONresponse(res, 200, {
                status: true,
                response: this.filterTokenPrices(prices, tokens, currency),
            })
        }).catch((error: Error) => {
            sendJSONresponse(res, 500, {
                status: 500,
                error,
            });
        });
    }

    private filterTokenPrices(prices: any[], tokens: IToken[], currency: string): any {
        const altContract = "0x0000000000000000000000000000000000000000"; // ETH, EHC, POA, CLO
        const pricesCoinmarket = prices[0];
        const pricesMap: IPrice[] = pricesCoinmarket.reduce((map: any, obj: any) => {
            map[obj.id] = obj;
            return map;
        }, {});

        const altValues = {
            "ETH": "ethereum",
            "ETC": "ethereum-classic",
            "POA": "poa-network",
            "CLO": "callisto-network"
        }

        const result1 = tokens.map((token: IToken) => {
            const contract: string = token.contract;
            const contractLowerCase: string = token.contract.toLowerCase();
            const symbol: string = token.symbol;
            const currencyLowerCase = currency.toLowerCase()

            if (contract === altContract && altValues.hasOwnProperty(symbol)) {
                const id = altValues[token.symbol];
                const tokenPrice: IPrice = pricesMap[id];
                const price = tokenPrice["price_" + currencyLowerCase]
                return {
                    id: tokenPrice.id,
                    name: tokenPrice.name,
                    symbol,
                    price,
                    percent_change_24h: tokenPrice.percent_change_24h || "0",
                    contract: contract,
                    image: this.getImageUrl(token.contract),
                }
            } else if (contracts.hasOwnProperty(contractLowerCase)) {
                const id = contracts[contractLowerCase].id;
                const tokenPrice: any = pricesMap[id] || {};
                const price = tokenPrice["price_" + currencyLowerCase];

                return {
                    id: tokenPrice.id || "",
                    name: tokenPrice.name || "",
                    symbol: token.symbol || "",
                    price: price || "",
                    percent_change_24h: tokenPrice.percent_change_24h || "0",
                    contract,
                    image: this.getImageUrl(contract),
                }
            } else {
                return {
                    id: "",
                    name: "",
                    symbol,
                    price: "0",
                    percent_change_24h: "0",
                    contract,
                    image: this.getImageUrl(contract),
                }
             }
        })

        return result1;
    }

    private getImageUrl(contract: string): string {
        return `${this.githubImageURL}${contract.toLowerCase()}.png`;
    }

    private async getRemotePrices(currency: string) {
            const now = Date.now();
            const lastUpdatedTime = this.lastUpdated[currency] || 0;
            const difference = (now - lastUpdatedTime) / 1000;

            const isUpdating = this.isUpdating[currency] || false;
            if ((this.lastUpdated === 0 || difference >= this.refreshLimit) && !isUpdating) {
                this.isUpdating[currency] = true;

                try {
                    const prices = await this.getCoinMarketCapPrices(currency).timeout(6000);

                    this.lastUpdated[currency] = now;
                    this.latestPrices[currency] = prices;
                    this.isUpdating[currency] = false;
                    return [this.latestPrices[currency]];

                } catch (error) {
                    winston.error("getRemotePrices ", error);

                    this.isUpdating[currency] = false;

                    return new BluebirbPromise((resolve, reject) => {
                        reject((this.latestPrices[currency] || []));
                    });
                }
            } else {
                return new BluebirbPromise(resolve => {
                    resolve([this.latestPrices[currency]])
                })
            }
    }

    private getCoinMarketCapPrices(currency: string) {
        return new BluebirbPromise((resolve, reject) => {
            this.client.getTicker({limit: 0, convert: currency}).then((prices: any) => {
                resolve(prices);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }
}