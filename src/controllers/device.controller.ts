import { Request, Response } from "express";
import { sendJSONresponse } from "../common/utils";
import { Device } from "../models/device.model";


export class DeviceController {

    public readAllDevices(req: Request, res: Response) {
        Device.find({}).exec().then((devices: any) => {
            sendJSONresponse(res, 200, devices);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    public readOneDevice(req: Request, res: Response) {
        if (!req.params || !req.params.deviceId) {
            sendJSONresponse(res, 404, { "message": "No device ID in request" });
            return;
        }
        Device.findById(req.params.deviceId).exec().then((device: any) => {
            if (!device) {
                sendJSONresponse(res, 404, {"message": "device ID not found"});
                return;
            }
            sendJSONresponse(res, 200, device);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    public createOneDevice(req: Request, res: Response) {
        if (!req.body.token) {
            sendJSONresponse(res, 404, {"message": "No device token in request"});
            return;
        }
        new Device({token: req.body.token}).save().then((device: any) => {
            sendJSONresponse(res, 201, device);
        }).catch((err: Error) => {
            sendJSONresponse(res, 400, err);
        });
    }

    public updateOneDevice(req: Request, res: Response) {
        if (!req.params || !req.params.deviceId) {
            sendJSONresponse(res, 404, {"message": "No device ID in request"});
            return;
        }
        if (!req.body.wallet) {
            sendJSONresponse(res, 404, {"message": "No wallet address in request"});
            return;
        }
        const promise = Device.findByIdAndUpdate(req.params.deviceId, {"$push": {"wallets": req.body.wallet}},
            {new: true}).exec();
        promise.then((device: any) => {
            sendJSONresponse(res, 204, device);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

}