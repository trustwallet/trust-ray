import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Device } from "../models/DeviceModel";
import * as winston from "winston";
import { Error } from "mongoose";
import { ISavedDevice } from "./Interfaces/IPusherController"

export class Pusher {
    register(req: Request, res: Response) {
        const wallets: string[] = req.body.wallets.map((wallet: string) => wallet.toLowerCase());
        const unuqieWallets = [...(new Set(wallets))];
        const inputPreferences = req.body.preferences || {};
        const preferences = {
            isAirdrop: inputPreferences.isAirdrop || false
        }

        Device.findOneAndUpdate({
            deviceID: req.body.deviceID
        }, {
            wallets: unuqieWallets,
            token: req.body.token,
            preferences
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
        ).then((savedDevice: ISavedDevice) => {
            sendJSONresponse(res, 200, {
                status: 200,
                message: "Successfully saved",
                response: savedDevice,
            });
        }).catch((error: Error) => {
            winston.error("Failed to save device ", error);
            sendJSONresponse(res, 500, {
                status: 500,
                message: "Failed to save device",
                error,
              });
        });
    }

    unregister(req: Request, res: Response): void {
        Device.findOneAndRemove({
            deviceID: req.body.deviceID
        }).then((savedDevice: ISavedDevice) => {
            sendJSONresponse(res, 200, {
                status: true,
                message: "Successfully unregistered",
                response: savedDevice,
            })
        }).catch((error: Error) => {
            winston.info("Error unregistering ", error);
            sendJSONresponse(res, 500, {
                status: false,
                message: "Failed to remove",
                error,
            })
        });
    }
}
