import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import axios from "axios";
import * as winston from "winston";
import { IAsset } from "./Interfaces/IAssetsController";
export class AssetsController {
    private openSeaURL: string = "https://opensea-api.herokuapp.com/assets/?order_by=auction_created_date&order_direction=desc&owner=";

    getAssets = async (req: Request, res: Response) => {
        const address: string = req.query.address;
        try {
            const assets = await this.getAssetsByAddress(address);
            const map = assets.map((asset: IAsset) => {
                return {
                    image_url: asset.image_url,
                    name: asset.name,
                    external_link: asset.external_link,
                    description: asset.description
                }
            });
        sendJSONresponse(res, 200, {
            docs: map
        });
        } catch (error) {
            sendJSONresponse(res, 404, "Assets can not be retrived");
        }
    }

    private async getAssetsByAddress(address: string) {
        try {
            const assets = await axios.get(`${this.openSeaURL}${address}`).then((res: any) => res.data.assets);
            return assets;
        } catch (error) {
            winston.error(`Error`, error)
        }
    }
}