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

    private static filterPrices(prices: any[], symbols: string[], currency: string): any {
        //Improve. Exclude duplicate symbols. order by market cap.
        let foundSymbols = new Set<any>();
        let foundPrices: any[] = []
        prices.forEach(price => {
            if (price.symbol === "CAT") return;
            if (price.symbol === symbols.find(x => x === price.symbol) && !foundSymbols.has(price.symbol)) {
                foundPrices.push(price)
                foundSymbols.add(price.symbol)
            }
        })
        return foundPrices.map((price) => {
            let priceKey = "price_" + currency.toLowerCase();
            return {
                id: price.id,
                name: price.name,
                symbol: price.symbol,
                price: price[priceKey],
                percent_change_24h: price.percent_change_24h
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
