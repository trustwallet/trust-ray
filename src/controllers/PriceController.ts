import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import * as winston from "winston";
const axios = require("axios");
import { Promise } from "bluebird";

const listOfTokens = require("../common/tokens/contracts");
const CoinMarketCap = require("coinmarketcap-api");

interface Token {
    contract: string;
    symbol: string;
}

export class PriceController {
    private client = new CoinMarketCap();
    private refreshLimit = 600;
    private lastUpdated: any = {};
    private latestPrices: any = {};
    private latestAlternativePrices: any = {};
    private isUpdating: any = {};
    private coinmarketcapImageURL = "https://files.coinmarketcap.com/static/img/coins/128x128/";
    private githubImageURL = "https://raw.githubusercontent.com/TrustWallet/tokens/master/images/";
    private privateAPIURL = "https://script.googleusercontent.com/macros/echo?user_content_key=yLmyy_8aJ0fr1-ZwaEocEMwY6ONXZAmb8wBklpBolPXEjphIQzVF7msRQCOExuLzK3Cg1rcvFApc2btMF4MledH3NNXTJ0DPOJmA1Yb3SEsKFZqtv3DaNYcMrmhZHmUMWojr9NvTBuBLhyHCd5hHa1ZsYSbt7G4nMhEEDL32U4DxjO7V7yvmJPXJTBuCiTGh3rUPjpYM_V0PJJG7TIaKpz0N633sUmm0c4i8l6NExquAqcslHnMzWh_ptf1Lg73-03UfxvOKFRhO8HM20klqPcKiW3k6MDkf31SIMZH6H4k&lib=MbpKbbfePtAVndrs259dhPT7ROjQYJ8yx";

    getPrices = (req: Request, res: Response) => {
        const currency = req.query.currency || "USD";
        const symbols = (req.query.symbols || "").split(",");

        this.getRemotePrices(currency).then((prices: any) => {
            sendJSONresponse(res, 200, {
                status: true,
                response: this.filterPrices(prices, symbols, currency),
            })
        }).catch((error: Error) => {
            sendJSONresponse(res, 500, {
                status: 500,
                error,
            });
        });
    }

    getTokenPrices = (req: Request, res: Response) => {
        const currency = req.body.currency || "USD";
        const symbols = req.body.tokens.map((item: Token) => item.symbol);
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

    private filterTokenPrices(prices: any[], tokens: Token[], currency: string): any {
        const pricesCoinmarket = prices[0];
        const pricesAlternative = prices[1];
        
        const result = pricesCoinmarket.reduce(function(map:any, obj:any) {
            map[obj.id] = obj;
            return map;
        }, {});

        const alternativeResult = pricesAlternative.reduce(function(map:any, obj:any) {
            map[obj.contract] = obj;
            return map;
        }, {});

        const foundValues: any[] = [];
        const foundSymbols = new Set<string>();

        tokens.forEach((token:any) => {
            const contract = token.contract.toLowerCase();
            const existedToken = listOfTokens[contract];

            if (existedToken) {
                const altToken = alternativeResult[contract];
                const tokenSymbol = existedToken.symbol;

                foundSymbols.add(tokenSymbol.toLowerCase());

                foundValues.push({
                    id: existedToken.id,
                    name:  existedToken.name,
                    symbol: tokenSymbol,
                    price: altToken.current_price.toString(),
                    percent_change_24h: altToken['24_hours_change_%'].toString(),
                    contract: altToken.contract,
                    image: this.getImageUrl(altToken.contract)
                })
            }
        });

        tokens.forEach((token: Token) => {
            const existedToken = listOfTokens[token.contract.toLowerCase()]

            if (existedToken && !foundSymbols.has(existedToken.symbol.toLowerCase())) {
                const price = result[existedToken.id];
                foundValues.push({...price, ...token});
            } 
            else {
                const tokenSymbol = token.symbol.toLowerCase()
                pricesCoinmarket.forEach((price:any) => {
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
                image: obj.image || this.imageForPrice(obj.id),
            }
        })
    }

    private getImageUrl(contract: string): string {
        return `${this.githubImageURL}${contract.toLowerCase()}.png`;
    }

    private filterPrices(prices: any[], symbols: string[], currency: string): any {
        // Improve. Exclude duplicate symbols. order by market cap.
        const ignoredSymbols = new Set<string>(["CAT"]);
        const foundSymbols = new Set<any>();
        const foundPrices: any[] = [];
        prices.forEach(price => {
            const priceSymbol: string = price.symbol;

            if (ignoredSymbols.has(priceSymbol)) return;

            if (priceSymbol === symbols.find(x => x === priceSymbol) && !foundSymbols.has(priceSymbol)) {
                foundPrices.push(price);
                foundSymbols.add(priceSymbol);
            }
        })
        return foundPrices.map((price) => {
            const priceKey = "price_" + currency.toLowerCase();
            return {
                id: price.id,
                name: price.name,
                symbol: price.symbol,
                price: price[priceKey],
                percent_change_24h: price.percent_change_24h || "0",
                image: this.imageForPrice(price.id),
            }
        })
    }

    private getRemotePrices(currency: string) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const lastUpdatedTime = this.lastUpdated[currency] || 0;
            const difference = (now - lastUpdatedTime) / 1000;

            const isUpdating = this.isUpdating[currency] || false;
            if ((this.lastUpdated === 0 || difference >= this.refreshLimit) && !isUpdating) {
                this.isUpdating[currency] = true;
                this.getCoinMarketCapPrices(currency).timeout(5000).then((prices: any) => {
                    this.lastUpdated[currency] = now;
                    this.latestPrices[currency] = prices;
                    this.isUpdating[currency] = false;

                    this.getAlternativePrices(currency).timeout(5000).then((altPrices:any) => {
                        this.latestAlternativePrices[currency] = altPrices;
                        resolve([this.latestPrices[currency], this.latestAlternativePrices[currency]]);
                    })
                }).catch((error: Error) => {
                    this.isUpdating[currency] = false
                    resolve(this.latestPrices[currency] || []);
                    winston.error(`getRemotePrices `, error);
                });
            } else {
                resolve([this.latestPrices[currency], this.latestAlternativePrices[currency]]);
            }
        })
    }

    private getAlternativePrices(currency: string) {
        const url: string = this.privateAPIURL;
        return new Promise((resolve) => {
            axios.get(url).then((res:any) => res)
                .then((prices:any) => {
                    const filtered: any = this.filterAlternativePricesByCurrency(currency, prices.data.Sheet1);
                    resolve(filtered);
                })
        })
    }

    private filterAlternativePricesByCurrency(currency: string, prices: any) {
        const sortedPrices: any[] = [];
        if (prices.length > 0) {
            prices.forEach((price: any) => {
                if (price.currency === currency) {
                    sortedPrices.push(price);
                }
            });
            return sortedPrices;
        }

        return sortedPrices;
    }

    private imageForPrice(id: string) {
        return this.coinmarketcapImageURL + id + ".png";
    }

    private getCoinMarketCapPrices(currency: string) {
        return new Promise((resolve, reject) => {
            this.client.getTicker({limit: 0, convert: currency}).then((prices: any) => {
                resolve(prices);
            });
        });
    }
}
