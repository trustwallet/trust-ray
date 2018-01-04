import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import * as winston from "winston";
import * as axios from "axios"

const CoinMarketCap = require('coinmarketcap-api')
const client = new CoinMarketCap();

let lastUpdated: any = {};
let latestPrices: any = {};
const refreshLimit = 150;
const limit = 2000;

export class PriceController {
    getPrices(req: Request, res: Response) {
        const currency = req.query.currency || "USD";
        const symbols = (req.query.symbols || "").split(",");
        
        PriceController.getRemotePrices(currency).then((value: any) => {
            let prices = PriceController.filterPrices(value, symbols, currency)
            sendJSONresponse(res, 200, {
                status: true, 
                response: prices,
            })
        }).catch((error: Error) => {
            sendJSONresponse(res, 500, {
                status: 500, 
                error,
            });
        })        
    }

    getTokenPrices(req: Request, res: Response) {
        const currency = req.body.currency || "USD";
        const symbols = req.body.tokens.map((item: any) => item.symbol )

        console.log(req.body.tokens)

        PriceController.getRemotePrices(currency).then((prices: any) => {
            sendJSONresponse(res, 200, {
                status: true, 
                response: PriceController.filterTokenPrices(prices, req.body.tokens, currency),
            })
        }).catch((error: Error) => {
            sendJSONresponse(res, 500, {
                status: 500, 
                error,
            });
        })   
    }

    private static filterTokenPrices(prices: any[], tokens: any[], currency: string): any {
        const result = prices.reduce(function(map, obj) {
            map[obj.id] = obj;
            return map;
        }, {});

        let foundValues: any[] = [];
        //Exclude duplicates, map contracts to symbols
        prices.forEach(price => {
            tokens.forEach((token) => {
                if (price.symbol === token.symbol) {
                    foundValues.push({price, token});
                }
            })
        })

        return foundValues.map((obj) => {
            const priceKey = "price_" + currency.toLowerCase();
            return {
                id: obj.price.id,
                name: obj.price.name,
                symbol: obj.price.symbol,
                price: obj.price[priceKey],
                percent_change_24h: obj.price.percent_change_24h,
                contract: obj.token.contract
            }
        })
    }

    private static filterPrices(prices: any[], symbols: string[], currency: string): any {
        //Improve. Exclude duplicate symbols. order by market cap.

        const ignoredSymbols = new Set<string>(["CAT"]);
        let foundSymbols = new Set<any>();
        let foundPrices: any[] = [];
        prices.forEach(price => {
            if (ignoredSymbols.has(price.symbol)) return;

            if (price.symbol === symbols.find(x => x === price.symbol) && !foundSymbols.has(price.symbol)) {
                foundPrices.push(price);
                foundSymbols.add(price.symbol);
            }
        })
        return foundPrices.map((price) => {
            const priceKey = "price_" + currency.toLowerCase();
            return {
                id: price.id,
                name: price.name,
                symbol: price.symbol,
                price: price[priceKey],
                percent_change_24h: price.percent_change_24h,
            }
        })
    }

    private static getRemotePrices(currency: string) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const lastUpdatedTime = lastUpdated[currency] || 0
            const difference = (now - lastUpdatedTime) / 1000;

            if (lastUpdated === 0 || difference >= refreshLimit) {
                return client.getTicker({limit: 0, convert: currency}).then((value: any) => {
                    lastUpdated[currency] = now;
                    latestPrices[currency] = value;
                    return resolve(latestPrices[currency]);
                })
            } else {
                return resolve(latestPrices[currency]);
            }            
        })
    }
}
