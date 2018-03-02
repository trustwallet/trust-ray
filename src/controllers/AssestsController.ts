import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import axios from "axios";
import * as winston from "winston";
import { IAsset } from "./Interfaces/IAssetsController";
import s3 from "../common/S3";
import * as Bluebird from "bluebird";
const svg2png = require("svg2png");

export class AssetsController {
    private openSeaURL: string = "https://opensea-api.herokuapp.com/assets/?order_by=auction_created_date&order_direction=desc&owner=";

    getAssets = async (req: Request, res: Response) => {
        const address: string = req.query.address;
        try {
            const assetsByAddress = await this.getAssetsByAddress(address);
            const assets = assetsByAddress.map((asset: IAsset) => {
                return {
                    image_url: asset.image_url,
                    name: asset.name,
                    external_link: asset.external_link,
                    description: asset.description
                }
            });

            const assetsURI: string[] = assets.map((asset: IAsset) => asset.image_url);
            const urlBuffers = await this.getURLBuffer(assetsURI);
            const s3URLs = await this.uploadToS3(urlBuffers);
            const final = this.mergeAssets(assets, s3URLs);

        sendJSONresponse(res, 200, {
            docs: final
        });
        } catch (error) {
            sendJSONresponse(res, 404, "Assets can not be retrived");
        }
    }

    private mergeAssets(assets: any, urls: any): any[] {
        return assets.map((asset: any, i: number) => {
            return Object.assign(asset, {external_link: urls[i]})
        });

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

    private uploadToS3(buffers: any[]) {

        return Bluebird.map(buffers, async (buffer) => {
            const bufferPNG = await this.convertSvg(buffer.buffer);
            const params = {
                ACL: "public-read",
                Bucket: "trustwallet",
                Key: `${this.getID(buffer.url)}.png`,
                ContentType: "image/png",
                Body: bufferPNG
            }

            return s3.upload(params).promise().then((uploaded: any) => {
                return uploaded.Location;
            })
            .catch((error) => {
                winston.error(`Error uploading image ot S3`, error);
            })
        })
    }

    private getID(url: string): string {
        return url.substring(url.lastIndexOf("/") + 1, url.lastIndexOf("."));
    }

    private convertSvg(buffer: any) {
        return svg2png(buffer, {
            width: 256,
            height: 256
        }).then((pngBuffer: any) => pngBuffer)
        .catch((errr: Error) => {
            winston.error(`Errro converting SVg`, errr)
        })
    }
}



