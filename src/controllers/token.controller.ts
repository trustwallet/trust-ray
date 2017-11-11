import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Token } from "../models/token.model";


export class TokenController {

    public readOneToken(req: Request, res: Response) {
        if (!req.params || !req.params.tokenWalletAddress) {
            sendJSONresponse(res, 404, { "message": "No token wallet address in request" });
            return;
        }
        Token.find({address: req.params.tokenWalletAddress}).exec().then((token: any) => {
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
        const queryParams = TokenController.extractQueryParameters(req);

        // build up query
        const query: any = {};

        const promise = Token.paginate(query, {page: queryParams.page, limit: queryParams.limit});
        promise.then( (tokens: any) => {
            sendJSONresponse(res, 200, tokens);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    private static extractQueryParameters(req: Request) {
        let page = parseInt(req.query.page, 50);
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        let limit = parseInt(req.query.limit, 50);
        if (isNaN(limit)) {
            limit = 50;
        } else if (limit > 500) {
            limit = 500;
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