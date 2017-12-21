import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Device } from "../models/DeviceModel";
import * as winston from "winston";
import { Error } from "mongoose";

export class Pusher {
    register(req: Request, res: Response) {
        Device.findOneAndUpdate({
            deviceID: req.body.deviceID
        }, {
            wallets: req.body.wallets,
            token: req.body.token
        }, {
            upsert: true,
            new: true
        }
        ).then((updateResult: any) => {
            sendJSONresponse(res, 200, {
                status: 200,
                message: "Successfully saved",
                response: updateResult,
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
        }).then((delitionResult: any) => {
            if (!delitionResult) {
                throw new Error("Can't find deviceID in DB");
            }
            sendJSONresponse(res, 200, {
                status: true, 
                message: "Successfully unregistered",
                response: delitionResult
            })
        }).catch((error: Error) => {
            winston.info("Error unregister ", error);
            sendJSONresponse(res, 500, {
                status: false, 
                message: "Failed to remove",
                error,
            })
        });
    }
}