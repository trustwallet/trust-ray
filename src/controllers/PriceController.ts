import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import * as winston from "winston";
import * as axios from "axios"

const CoinMarketCap = require('coinmarketcap-api')
const client = new CoinMarketCap();

let lastUpdated: number = 0;
let latestPrices: any = {};
const refreshLimit = 300;
const limit = 500;

export class PriceController {
    getPrices(req: Request, res: Response) {
        const currency = req.query.currency || "USD";
        const symbols = (req.query.symbols || "").split(",");
        
        PriceController.getRemotePrices(currency).then((value: any) => {
            let prices = PriceController.filterPrices(value, symbols)
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

    private static filterPrices(prices: any[], symbols: string[]): any {
        return prices.filter((price) => {
            return price.symbol === symbols.find(x => x === price.symbol)
        }).map((price) => {
            return {
                name: price.name,
                symbol: price.symbol,
                price: price.price_usd,
            }
        })
    }

    private static getRemotePrices(currency: string) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const difference = (now - lastUpdated) / 1000;

            if (lastUpdated === 0 || difference >= refreshLimit) {
                return client.getTicker({limit: limit, convert: currency}).then((value: any) => {
                    lastUpdated = now;
                    latestPrices[currency] = value;
                    return resolve(latestPrices[currency]);
                })
            } else {
                return resolve(latestPrices[currency]);
            }            
        })
    }
}
