import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Device } from "../models/DeviceModel";
import * as winston from "winston";
import { Error } from "mongoose";
import { ISavedDevice } from "./Interfaces/IPusherController"

export class Pusher {
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
