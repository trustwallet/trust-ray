import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import axios from "axios";
import * as winston from "winston";
import { IAsset } from "./Interfaces/IAssetsController";
import s3 from "../common/S3";
import * as Bluebird from "bluebird";
import * as config from "config";
import { Config } from "../common/Config"
const svg2png = require("svg2png");

export class AssetsController {
    private supportedNetworksIDs = [1, 4]
    private networkID: number;
    private openSeaURL: string;
    private mainnetOpenSeaURL: string = "https://opensea-api.herokuapp.com/assets/?limit=100&order_by=auction_created_date&order_direction=desc&owner=";
    private rinkebyOpenSeaURL: string = "https://etherbay-api-1.herokuapp.com/assets/?limit=100&order_by=auction_created_date&order_direction=desc&owner=";
    private S3BucketBaseURL: string = config.get("AWS.BUCKET_BASE_URL")
    private S3Bucket: string = config.get("AWS.BUCKET");

    getAssets = async (req: Request, res: Response) => {
        const validationErrors: any = this.validateQueryParameters(req)

        if (validationErrors) return sendJSONresponse(res, 400, validationErrors)

        if (!this.networkID) {
            this.networkID = await Config.web3.eth.net.getId().then((id: number) => id);
        }

        if (this.supportedNetworksIDs.indexOf(this.networkID) === -1) {
            return sendJSONresponse(res, 200, {
                docs: []
            });
        }

        this.setUrl(this.networkID);

        const address: string = req.query.address;
        try {
            const assetsByAddress = await this.getAssetsByAddress(address);
            const assets: any[] = assetsByAddress.map((asset: IAsset) => {
                return {
                    token_id: asset.token_id,
                    contract_address: asset.asset_contract.address.toLowerCase(),
                    category: asset.asset_contract.name,
                    image_url: asset.image_url,
                    name: asset.name,
                    external_link: asset.external_link,
                    description: asset.description
                }
            });

            const assets2 = await Bluebird.map(assets, async (asset) => {
                const assetURL = asset.image_url
                const fileExt = this.getAssetExtensionByURL(assetURL)
                const assetName = `${asset.contract_address}-${asset.token_id}`

                if (fileExt === "svg") {
                    if (await this.assetExists(assetName)) {
                        return {...asset, image_url: this.getAssetFullPath(assetName)}
                    } else {
                        const bufferURL = await this.getURLBuffer(assetURL)
                        const s3URLs = await this.getS3URL(asset.contract_address, asset.token_id, bufferURL)
                        return {...asset, image_url: s3URLs}
                    }
                } else {
                    return asset
                }
            })
            const assetsByCategory = this.mergeAssets(assets2);
        sendJSONresponse(res, 200, {
            docs: assetsByCategory
        });
        } catch (error) {
            sendJSONresponse(res, 404, "Assets can not be retrived");
        }
    }

    private setUrl(networkID: number) {
        if (networkID === 1) {
            this.openSeaURL = this.mainnetOpenSeaURL
        }
        if (networkID === 4) {
            this.openSeaURL = this.rinkebyOpenSeaURL;
        }
    }

    private mergeAssets(assets: IAsset[]) {
        const sortedAssets: any = [];
        const categories: any = {};

        assets.forEach((asset: any, i: number) => {
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

    private async getAssetsByAddress(address: string) {
        try {
            const assets = await axios.get(`${this.openSeaURL}${address}`).then((res: any) => res.data.assets);
            return assets;
        } catch (error) {
            winston.error(`Error getting assets from opensea`, error)
        }
    }

    private getURLBuffer = async (url: string) => {
        try {
            const buffer = await axios({method: "get", url, responseType: "arraybuffer"})
            return buffer.data
        } catch (error) {
            winston.error(`Error getting image ${url} buffer`, error);
        }
    }

    private getS3URL = async (assetContract: string, assetID: string, buffer: any) => {
        try {
            const bufferPNG = await this.converSvgToPng(buffer)
            const params = {
                ACL: "public-read",
                Bucket: this.S3Bucket,
                Key: `${assetContract}-${assetID}.png`,
                ContentType: `image/png`,
                Body: bufferPNG
            }

            const uploaded = await s3.upload(params).promise()
            return uploaded.Location
        } catch (error) {
            winston.error(`Error uploading image ot S3`, error);
            return ""
        }
    }

    public assetExists = async (assetName): Promise<boolean> => {
        try {
            const response = await axios.head(this.getAssetFullPath(assetName))
            return response.status === 200;
        } catch (error) {
            winston.error(`Error checking file ${this.getAssetFullPath(assetName)} existence on S3`)
            return false
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

    public getAssetExtensionByURL(url: string): string {
        return url.split(".").pop()
    }

    public getAssetFullPath(assetName: string): string {
        return `${this.S3BucketBaseURL}${this.S3Bucket}/${assetName}.png`
    }

    public validateQueryParameters(req: Request) {
        req.checkQuery("address", "address needs to be alphanumeric and have length 42").isAlphanumeric().isLength({min: 42, max: 42});

        return req.validationErrors();
    }
}

