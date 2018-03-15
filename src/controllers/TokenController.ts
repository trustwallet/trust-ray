import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Token } from "../models/TokenModel";
import * as xss from "xss-filters";
import { TokenParser } from "../common/TokenParser";
import axios from "axios";
const config = require("config");

export class TokenController {

    public readAllTokens(req: Request, res: Response) {

        // validate query input
        const validationErrors: any = TokenController.validateQueryParameters(req);
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        // extract query parameters
        const queryParams = TokenController.extractQueryParameters(req);

        const query: any = {};
        if (queryParams.address !== "undefined") {
            query.address = queryParams.address.toLowerCase();
        }

        TokenController.getRemoteTokens(queryParams.address).then((tokens: any) => {
            if (tokens) {
                sendJSONresponse(res, 200, {
                    docs: tokens
                });
            } else {
                sendJSONresponse(res, 404, "Balances for tokens could not be found.");
            }
        });
    }

    public static getRemoteTokens(address: string): any {
        const url = `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
        return axios.get(url).then((res: any) => {
            // easier this way
            if (config.get("RPC_SERVER") !== "http://gasprice.poa.network:8545") {
                return Promise.resolve([]);
            }
            const tokens = res.data.tokens.map((value: any) => {
                return {
                    balance: "0",
                    contract: {
                        address: value.tokenInfo.address,
                        name: value.tokenInfo.name,
                        decimals: parseInt(value.tokenInfo.decimals),
                        symbol: value.tokenInfo.symbol
                    }
                }
            })
            return Promise.resolve(tokens);
        }).then((value) => {
            return new TokenParser().getTokenBalances(address).then((balances: any) => {
                const tokens = balances.map((value: any) => {
                    return {
                        balance: "0",
                        contract: value.contract
                    }
                })
                return Promise.resolve(tokens.concat(value));
            });
        }).catch((err) => {
            return new TokenParser().getTokenBalances(address).then((balances: any) => {
                const tokens = balances.map((value: any) => {
                    return {
                        balance: "0",
                        contract: value.contract
                    }
                })
                return Promise.resolve(tokens);
            });
        })
    }

    public readOneToken(req: Request, res: Response) {
        if (!req.params || !req.params.address) {
            sendJSONresponse(res, 404, { "message": "No address in request" });
            return;
        }

        // validate wallet address
        req.checkParams("address", "wallet address must be alphanumeric").isAlphanumeric();
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        const address = xss.inHTMLData(req.params.address);

        Token.find({address: address}).populate("tokens").then((token: any) => {
            if (!token) {
                sendJSONresponse(res, 404, {"message": "wallet address not found"});
                return;
            }
            sendJSONresponse(res, 200, token);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    private static validateQueryParameters(req: Request) {
        req.checkQuery("page", "Page needs to be a number").optional().isNumeric();
        req.checkQuery("limit", "limit needs to be a number").optional().isNumeric();
        req.checkQuery("address", "address needs to be alphanumeric").isAlphanumeric();

        return req.validationErrors();
    }

    private static extractQueryParameters(req: Request) {
        // page parameter
        let page = parseInt(xss.inHTMLData(req.query.page));
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        // limit parameter
        let limit = parseInt(xss.inHTMLData(req.query.limit));
        if (isNaN(limit)) {
            limit = 50;
        } else if (limit > 500) {
            limit = 500;
        } else if (limit < 1) {
            limit = 1;
        }

        // address parameter
        const address = xss.inHTMLData(req.query.address);

        return {
            address: address,
            page: page,
            limit: limit
        };
    }

}