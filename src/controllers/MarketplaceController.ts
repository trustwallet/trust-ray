import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { marketsList } from "../common/marketplace/marketsList";

export class MarketplaceController {
    getMarkets = (req: Request, res: Response) => {
        sendJSONresponse(res, 200, {
            docs: marketsList
        })
    }
}
