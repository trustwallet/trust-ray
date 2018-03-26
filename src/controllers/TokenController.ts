import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Token } from "../models/TokenModel";
import { ERC20Contract } from "../models/Erc20ContractModel";
import * as xss from "xss-filters";
import { TokenParser } from "../common/TokenParser";
import axios from "axios";
const config = require("config");
const _uniqBy = require("lodash.uniqby");

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
        const address = queryParams.address.toLowerCase();
        const query: any = {
            address: address
        };

        TokenController.getRemoteTokens(address).then((tokens: any) => {
            if (tokens) {
                sendJSONresponse(res, 200, {
                    docs: tokens
                });
            } else {
                sendJSONresponse(res, 404, "Balances for tokens could not be found.");
            }
        });
    }

     static getRemoteTokens(address: string) {
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
                        contract: value.tokenInfo.address,
                        address: value.tokenInfo.address,
                        name: value.tokenInfo.name,
                        decimals: parseInt(value.tokenInfo.decimals),
                        symbol: value.tokenInfo.symbol
                    }
                }
            })
            return tokens;
        }).then((ethplorerTokens) => {
            return new TokenParser().getTokenBalances(address).then((balances: any) => {
                const tokens = balances.map((value: any) => {
                    return {
                        balance: "0",
                        contract: TokenController.toERC20Format(value.contract)
                    }
                })
                const allTokens = tokens.concat(ethplorerTokens);
                const uniqTokens = _uniqBy(allTokens, "contract.address");
                return uniqTokens;
            });
        }).catch((err) => {
            return new TokenParser().getTokenBalances(address).then((balances: any) => {
                const tokens = balances.map((value: any) => {
                    return {
                        balance: "0",
                        contract: TokenController.toERC20Format(value.contract)
                    }
                })
                return Promise.resolve(tokens);
            });
        })
    }

    static toERC20Format(contract: any): any {
        return {
            contract: contract.address,
            address: contract.address,
            name: contract.name,
            decimals: contract.decimals,
            symbol: contract.symbol
        }
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

        Token.find({_id: address}).populate({path: "tokens", select: "-_id"}).then((token: any) => {
            if (!token) {
                sendJSONresponse(res, 404, {"message": "wallet address not found"});
                return;
            }
            sendJSONresponse(res, 200, {
                address: token[0]._id,
                tokens: token[0].tokens
            });
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    public readTokenInfo(req: Request, res: Response) {
        if (!req.params || !req.params.tokenAddress) {
            sendJSONresponse(res, 404, { "message": "No token address in request" });
            return;
        }

        req.checkParams("tokenAddress", "wallet address must be alphanumeric").isAlphanumeric();
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        const address = xss.inHTMLData(req.params.tokenAddress);

        ERC20Contract.findOne({address}).then((erc20: any) => {
            sendJSONresponse(res, 200, erc20);
        }).catch((error: Error) => {
            sendJSONresponse(res, 404, error);
        })
    }

    public listTokens(req: Request, res: Response) {
        const term = req.query.query;
        if (!term) {
            sendJSONresponse(res, 404, {"message": "need query"})
            return;
        }
        const queryParams = TokenController.extractQueryParameters(req);
        const re = new RegExp(term, "i");
        const query = ERC20Contract.find().or([
            { "name": { $regex: re }},
            { "symbol": { $regex: re }},
            { "address": { $regex: re }}
        ])
        ERC20Contract.paginate(query, {
            page: queryParams.page,
            limit: queryParams.limit,
        }).then((contracts: any) => {
            sendJSONresponse(res, 200, contracts);
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