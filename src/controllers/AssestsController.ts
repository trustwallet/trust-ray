import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import axios from "axios";
import * as winston from "winston";
import { IAsset } from "./Interfaces/IAssetsController";
import s3 from "../common/S3";
import * as Bluebird from "bluebird";
import * as config from "config";
const svg2png = require("svg2png");

export class AssetsController {
    private openSeaURL: string = "https://opensea-api.herokuapp.com/assets/?order_by=auction_created_date&order_direction=desc&owner=";

    getAssets = async (req: Request, res: Response) => {
        const address: string = req.query.address;
        try {
            const assetsByAddress = await this.getAssetsByAddress(address);
            const assets: IAsset[] = assetsByAddress.map((asset: IAsset) => {
                return {
                    token_id: asset.token_id,
                    contract_address: asset.asset_contract.address,
                    category: asset.asset_contract.name,
                    image_url: asset.image_url,
                    name: asset.name,
                    external_link: asset.external_link,
                    description: asset.description
                }
            });
            const assetsURI: string[] = assets.map((asset: IAsset) => asset.image_url);
            const urlBuffers = await this.getURLBuffer(assetsURI);
            const s3URLs = await this.getS3URL(urlBuffers);
            const assetsByCategory = this.mergeAssets(assets, s3URLs);

        sendJSONresponse(res, 200, {
            docs: assetsByCategory
        });
        } catch (error) {
            sendJSONresponse(res, 404, "Assets can not be retrived");
        }
    }

    private mergeAssets(assets: IAsset[], urls: string[]) {
        const sortedAssets: any = [];
        const categories: any = {};

        assets.forEach((asset: any) => {
            const assetID = asset.contract_address;

            if (categories.hasOwnProperty(assetID)) {
                if (categories[assetID].id = assetID) {
                    categories[assetID].items.push(asset);
                }
            } else {
                categories[assetID] = {
                    name: asset.category,
                    id: asset.contract_address,
                    items: []
                }
                
                categories[assetID].items.push(asset)
            }
        })

        for (const id in categories) {
            sortedAssets.push(categories[id])
        }

        return sortedAssets
    }

    getAssetName(name: string): string {
        return name.substring(0, name.indexOf(" ") + 1);
    }

    private async getAssetsByAddress(address: string) {
        try {
            const assets = await axios.get(`${this.openSeaURL}${address}`).then((res: any) => res.data.assets);
            return assets;
        } catch (error) {
            winston.error(`Error`, error)
        }
    }

    private getURLBuffer(urls: string[]) {
        return Bluebird.map(urls, url => {
            return axios({
                method: "get",
                url,
                responseType: "arraybuffer"
            })
            .then((res: any) => {
                return {
                    url,
                    buffer: res.data
                }
            })
            .catch((error) => {
                winston.error(`Error getting image`, error);
            })
        })
    }

    private getS3URL(buffers: any[]) {

        return Bluebird.map(buffers, async (buffer) => {
            const url: string = buffer.url;
            const fileExt: string = url.split(".").pop();
            const fileName: string = url.substring(url.lastIndexOf("/") + 1, url.lastIndexOf("."));

            if (fileExt === "png") return url;

            if (fileExt === "svg") {
                const bufferPNG = await this.converSvgToPng(buffer.buffer);
                const params = this.getS3Params(fileName, "png", bufferPNG);

                return s3.upload(params).promise().then((uploaded: any) => {
                    return uploaded.Location;
                })
                .catch((error) => {
                    winston.error(`Error uploading image ot S3`, error);
                })
            }
        })
    }

    private getS3Params(name: string, ext: string, buffer: any) {
        const bucket: string = config.get("AWS.BUCKET");
        return  {
            ACL: "public-read",
            Bucket: bucket,
            Key: `${name}.${ext}`,
            ContentType: `image/${ext}`,
            Body: buffer
        }
    }

    private converSvgToPng(buffer: any) {
        return svg2png(buffer, {
            width: 256,
            height: 256
        }).then((pngBuffer: any) => pngBuffer)
        .catch((errr: Error) => {
            winston.error(`Error converting SVG`, errr)
        })
    }
}

