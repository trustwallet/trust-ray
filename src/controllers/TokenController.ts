import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Token } from "../models/TokenModel";
import { ERC20Contract } from "../models/Erc20ContractModel";
import * as xss from "xss-filters";
import { TokenParser } from "../common/TokenParser";
const config = require("config");

export class TokenController {
    private getTokenBalance: any

    constructor() {
        this.getTokenBalance = new TokenParser().getTokenBalance
    }

    public readAllTokens = async (req: Request, res: Response) => {
        const validationErrors: any = TokenController.validateQueryParameters(req)

        if (validationErrors) return sendJSONresponse(res, 400, validationErrors)

        const queryParams = this.extractQueryParameters(req)
        const address = queryParams.address.toLowerCase()
        const showBalance = queryParams.showBalance === "true"

        const tokens = await this.getTokensByAddress(address, showBalance)

        sendJSONresponse(res, 200, {docs: tokens})
    }

    private async getTokensByAddress(address: string, showBalance: boolean) {
        const tokens = await Token.findOne({_id: address}).populate({path: "tokens"}).then((tokens: any) => tokens)

        if (tokens) {
            const tok = tokens.tokens.map(async (token: any) => {
                let balance: string = "0"
                const tokenAddress = token.address

                if (showBalance) {
                    balance = await this.getTokenBalance(address, tokenAddress).then((balance: any) => balance ? balance : "0")
                }

                return {
                    balance,
                    contract: {
                        contract: tokenAddress,
                        address: tokenAddress,
                        name: token.name,
                        decimals: token.decimals,
                        symbol: token.symbol
                    }
                }
            })
            return Promise.all(tok)
        } else {
            return Promise.resolve([])
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
        const re = new RegExp(term, "i");
        ERC20Contract.find().limit(20).or([
            { "name": { $regex: re }},
            { "symbol": { $regex: re }},
            { "address": { $regex: re }}
        ]).exec().then((contracts: any) => {
            const verifiedFirst = contracts.sort((a, b) => a.verified === true ? -1 : 1)
            sendJSONresponse(res, 200, verifiedFirst);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    public listTokensNew = (req: Request, res: Response) => {
        const term = req.query.query;
        if (!term) {
            sendJSONresponse(res, 404, {"message": "need query"})
            return;
        }
        const queryParams = this.extractQueryParameters(req);
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
        req.checkQuery("address", "address needs to be alphanumeric").isAlphanumeric().isLength({min: 42, max: 42});
        req.checkQuery("showBalance", "showBalance needs to be a boolean").optional().isBoolean();

        return req.validationErrors();
    }

    private extractQueryParameters(req: Request) {
        let page = parseInt(xss.inHTMLData(req.query.page));
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        let limit = parseInt(xss.inHTMLData(req.query.limit));
        if (isNaN(limit)) {
            limit = 50;
        } else if (limit > 500) {
            limit = 500;
        } else if (limit < 1) {
            limit = 1;
        }

        const address = xss.inHTMLData(req.query.address);
        const showBalance = req.query.showBalance;

        return {
            address,
            page,
            limit,
            showBalance
        };
    }
}
