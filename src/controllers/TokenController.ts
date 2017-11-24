import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Token } from "../models/TokenModel";
import * as xss from "xss-filters";


export class TokenController {

    public readOneToken(req: Request, res: Response) {
        if (!req.params || !req.params.tokenWalletAddress) {
            sendJSONresponse(res, 404, { "message": "No token wallet address in request" });
            return;
        }

        // validate token wallet address
        req.checkParams("tokenWalletAddress", "token wallet address must be alphanumeric").isAlphanumeric();
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        const tokenWalletAddress = xss.inHTMLData(req.params.tokenWalletAddress);

        Token.find({address: tokenWalletAddress}).exec().then((token: any) => {
            if (!token) {
                sendJSONresponse(res, 404, {"message": "token wallet address not found"});
                return;
            }
            sendJSONresponse(res, 200, token);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    public readAllTokens(req: Request, res: Response) {

        // validate query input
        const validationErrors: any = TokenController.validateQueryParameters(req);
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        const queryParams = TokenController.extractQueryParameters(req);

        // TODO: build up query
        const query: any = {};

        const promise = Token.paginate(query, {page: queryParams.page, limit: queryParams.limit});
        promise.then( (tokens: any) => {
            sendJSONresponse(res, 200, tokens);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    private static validateQueryParameters(req: Request) {
        req.checkQuery("page", "Page needs to be a number").optional().isNumeric();
        req.checkQuery("limit", "limit needs to be a number").optional().isNumeric();
        req.checkQuery("address", "address needs to be alphanumeric").optional().isAlphanumeric();

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