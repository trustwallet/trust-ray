import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Wallet } from "../models/wallet.model";


export class WalletController {

    public readOneWallet(req: Request, res: Response) {
        if (!req.params || !req.params.walletAddress) {
            sendJSONresponse(res, 404, { "message": "No wallet address in request" });
            return;
        }
        Wallet.find({address: req.params.walletAddress}).exec().then((wallet: any) => {
            if (!wallet) {
                sendJSONresponse(res, 404, {"message": "wallet address not found"});
                return;
            }
            sendJSONresponse(res, 200, wallet);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

}