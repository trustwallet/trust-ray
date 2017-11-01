import { Request, Response } from "express";
import { Token } from "../models/token.model";
import { sendJSONresponse } from "../common/utils";

export class TokenController {

    public readAllTokens(req: Request, res: Response) {
        const queryParams = TokenController.extractQueryParameters(req);

        // build up query
        const query: any = {};
        if (queryParams.address) {
            query.from = queryParams.address;
        }

        const promise = Token.paginate(query, {page: queryParams.page, limit: queryParams.limit});
        promise.then( (tokens: any) => {
            sendJSONresponse(res, 200, tokens);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    public readOneToken(req: Request, res: Response) {
        if (!req.params || !req.params.tokenId) {
            sendJSONresponse(res, 404, { "message": "No token ID in request" });
            return;
        }
        Token.findById(req.params.tokenId).exec().then((token: any) => {
            if (!token) {
                sendJSONresponse(res, 404, {"message": "token ID not found"});
                return;
            }
            sendJSONresponse(res, 200, token);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    private static extractQueryParameters(req: Request) {
        let page = parseInt(req.query.page, 10);
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        let limit = parseInt(req.query.limit, 10);
        if (isNaN(limit)) {
            limit = 10;
        } else if (limit > 50) {
            limit = 50;
        } else if (limit < 1) {
            limit = 1;
        }

        const address = req.query.address;

        return {
            address: address,
            page: page,
            limit: limit
        };
    }

}