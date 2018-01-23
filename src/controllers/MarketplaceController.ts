import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";

export class MarketplaceController {
    private json = [
        {
            "name": "Token Factory",
            "url": "https://tokenfactory.netlify.com/",
            "description": "Issue & Interact with Standard Token Contracts on Ethereum",
        }
    ]

    getMarkets = (req: Request, res: Response) => {
        sendJSONresponse(res, 200, this.json)
    }
}
