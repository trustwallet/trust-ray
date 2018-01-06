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
        ).then((result: any) => {
            sendJSONresponse(res, 200, {
                status: 200,
                message: "Successfully saved",
                response: result,
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
        }).then((result: any) => {
            sendJSONresponse(res, 200, {
                status: true, 
                message: "Successfully unregistered",
                response: result,
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