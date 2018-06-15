import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Device } from "../models/DeviceModel";
import * as winston from "winston";
import { ISavedDevice } from "./Interfaces/IPusherController"

export class DeviceRegistration {
    register = (req: Request, res: Response) => {
        const wallets = [...(new Set(req.body.wallets.map((wallet: string) => wallet.toLowerCase())))];
        const inputPreferences = req.body.preferences || {};
        const preferences = {
            isAirdrop: inputPreferences.isAirdrop || false
        }
        const type: string = req.body.type || ""
        const deviceID: string = req.body.deviceID || ""
        const token: string = req.body.token || ""
        const updatesParams = {
            deviceID,
            wallets,
            token,
            preferences,
            type
        }

        try {
            if (deviceID && token) {
                this.findOneAndRegister(res, {deviceID}, updatesParams)
            }
            else if (token && !deviceID && type === "android") {
                this.findOneAndRegister(res, {token}, updatesParams)
            } else {
                throw new TypeError()
            }
        } catch (error) {
            winston.error("Failed to save device ", error);
            this.sendOnRegisterFail(500, res, "Failed to save device, check if token, deviceID, or type specified correctly", error)
        }
    }

    private findOneAndRegister(res: Response, id, updateParams) {
        const updateOptions = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            fields: {_id: 0}
        }

        Device.findOneAndUpdate(id, updateParams, updateOptions).then(response => {
            sendJSONresponse(res, 200, {
                status: 200,
                message: "Successfully saved",
                response,
            });
        })
    }

    unregister = (req: Request, res: Response) => {
        const deviceID: string = req.body.deviceID
        const token: string = req.body.token
        const type: string = req.body.type

        try {
            if (deviceID) {
                this.findOneAndUnregister(res, {deviceID})
            }
            else if (token && !deviceID && type === "android") {
                this.findOneAndUnregister(res, {token})
            } else {
                throw new TypeError()
            }
        } catch (error) {
            winston.info(`Error unregistering `, error)
            this.sendOnUnregisterFail(500, res, "Failed to remove", error)
        }
    }

    private findOneAndUnregister(res: Response, id) {
        const removeOptions: any = {
            projection: {_id: 0}
        }
        Device.findOneAndRemove(id, removeOptions).then(removedDevice => {
            removedDevice ? this.sendOnUnregisterSuccess(res, removedDevice) : this.sendOnUnregisterFail(404, res, "Can not find device", removedDevice)
        })
    }

    private sendOnRegisterFail(code: number, res: Response, message: string, error) {
        sendJSONresponse(res, code, {
            status: code,
            message,
            error,
        })
    }

    private sendOnUnregisterSuccess (res: Response, removedDevice) {
        sendJSONresponse(res, 200, {
            status: 200,
            message: "Successfully unregistered",
            response: removedDevice,
        })
    }

    private sendOnUnregisterFail(code: number = 500, res: Response, message: string, error) {
        sendJSONresponse(res, code, {
            status: code,
            message,
            error,
        })
    }
}
