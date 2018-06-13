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
        const deviceID: string = req.body.deviceID
        const token: string = req.body.token
        const updateOptions = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
        const updatesParams = {
            deviceID,
            wallets,
            token,
            preferences,
            type
        }

        try {
            if (deviceID && token) {
                Device.findOneAndUpdate({deviceID}, updatesParams, updateOptions).then(registeredDevice => {
                    this.sendOnRegisterSuccess(res, registeredDevice)
                })
            }
            else if (token && !deviceID && type === "android") {
                Device.findOneAndUpdate({token}, updatesParams, updateOptions).then(registeredDevice => {
                    this.sendOnRegisterSuccess(res, registeredDevice)
                })
            } else {
                throw new TypeError()
            }
        } catch (error) {
            winston.error("Failed to save device ", error);
            this.sendOnRegisterFail(500, res, "Failed to save device, check if token, deviceID, or type specified correctly", error)
        }
    }

    unregister = (req: Request, res: Response) => {
        const deviceID: string = req.body.deviceID
        const token: string = req.body.token
        const type: string = req.body.type

        try {
            if (deviceID) {
                Device.findOneAndRemove({deviceID}).then((removedDevice) => {
                    removedDevice ? this.sendOnUnregisterSuccess(res, removedDevice) : this.sendOnUnregisterFail(404, res, "Can not find device", removedDevice)
                })
            }
            else if (token && !deviceID && type === "android") {
                Device.findOneAndRemove({token}).then((removedDevice) => {
                    removedDevice ? this.sendOnUnregisterSuccess(res, removedDevice) : this.sendOnUnregisterFail(404, res, "Can not find device", removedDevice)
                })
            } else {
                throw new TypeError()
            }
        } catch (error) {
            winston.info(`Error unregistering `, error)
            this.sendOnUnregisterFail(500, res, "Failed to remove", error)
        }
    }

   private sendOnRegisterSuccess(res: Response, registeredDevice) {
        sendJSONresponse(res, 200, {
            status: 200,
            message: "Successfully saved",
            response: registeredDevice,
        });
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
