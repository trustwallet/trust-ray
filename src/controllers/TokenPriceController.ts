import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import * as winston from "winston";
const axios = require("axios");
import * as BluebirbPromise from "bluebird";
import { Config } from "../common/Config";
import { IToken } from "./Interfaces/ITokenPriceController";

const listOfTokens = require("../common/tokens/contracts");
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
        const symbols = req.body.tokens.map((item: IToken) => item.symbol);

        this.getRemotePrices(currency).then((prices: any) => {
            sendJSONresponse(res, 200, {
                status: true,
                response: this.filterTokenPrices(prices, req.body.tokens, currency),
            })
        }).catch((error: Error) => {
            sendJSONresponse(res, 500, {
                status: 500,
                error,
            });
        });
    }

    private filterTokenPrices(prices: any[], tokens: IToken[], currency: string): any {
        const pricesCoinmarket = prices[0];

        const result = pricesCoinmarket.reduce(function(map: any, obj: any) {
            map[obj.id] = obj;
            return map;
        }, {});

        const foundValues: any[] = [];
        const foundSymbols = new Set<string>();

        tokens.forEach((token: IToken) => {
            const existedToken = listOfTokens[token.contract.toLowerCase()]

            if (existedToken && !foundSymbols.has(existedToken.symbol.toLowerCase())) {
                const price = result[existedToken.id];
                foundValues.push({...price, ...token});
            } else {
                const tokenSymbol = token.symbol.toLowerCase()
                pricesCoinmarket.forEach((price: any) => {
                    const priceSymbol = price.symbol.toLowerCase()
                    if (priceSymbol === tokenSymbol && !foundSymbols.has(tokenSymbol)) {
                        foundSymbols.add(tokenSymbol);
                        foundValues.push({...price, ...token});
                    }
                });

                if (!foundSymbols.has(tokenSymbol)) {
                    foundSymbols.add(tokenSymbol);
                    foundValues.push({
                            symbol: token.symbol,
                            contract: token.contract,
                            image: this.getImageUrl(token.contract),
                    });
                }
            }
        })

        return foundValues.map((obj) => {
            return {
                id: obj.id || "0",
                name: obj.name || "",
                symbol: obj.symbol || "",
                price: obj.price || obj["price_" + currency.toLowerCase()] || "0",
                percent_change_24h: obj.percent_change_24h || "",
                contract: obj.contract || "",
                image: obj.image || this.getImageUrl(obj.contract),
            }
        })
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
                    const p1 = this.getCoinMarketCapPrices(currency).timeout(5000);

                    const [prices] = await Promise.all([p1]);

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
                    resolve(([this.latestPrices[currency]]))
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