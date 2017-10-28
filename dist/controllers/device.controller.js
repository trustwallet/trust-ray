"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const device_model_1 = require("../models/device.model");
class DeviceController {
    readAllDevices(req, res) {
        device_model_1.Device.find({}).exec().then((devices) => {
            utils_1.sendJSONresponse(res, 200, devices);
        }).catch((err) => {
            utils_1.sendJSONresponse(res, 404, err);
        });
    }
    readOneDevice(req, res) {
        if (!req.params || !req.params.deviceId) {
            utils_1.sendJSONresponse(res, 404, { "message": "No device ID in request" });
            return;
        }
        device_model_1.Device.findById(req.params.deviceId).exec().then((device) => {
            if (!device) {
                utils_1.sendJSONresponse(res, 404, { "message": "device ID not found" });
                return;
            }
            utils_1.sendJSONresponse(res, 200, device);
        }).catch((err) => {
            utils_1.sendJSONresponse(res, 404, err);
        });
    }
    createOneDevice(req, res) {
        if (!req.body.token) {
            utils_1.sendJSONresponse(res, 404, { "message": "No device token in request" });
            return;
        }
        new device_model_1.Device({ token: req.body.token }).save().then((device) => {
            utils_1.sendJSONresponse(res, 201, device);
        }).catch((err) => {
            utils_1.sendJSONresponse(res, 400, err);
        });
    }
    updateOneDevice(req, res) {
        if (!req.params || !req.params.deviceId) {
            utils_1.sendJSONresponse(res, 404, { "message": "No device ID in request" });
            return;
        }
        if (!req.body.wallet) {
            utils_1.sendJSONresponse(res, 404, { "message": "No wallet address in request" });
            return;
        }
        const promise = device_model_1.Device.findByIdAndUpdate(req.params.deviceId, { "$push": { "wallets": req.body.wallet } }, { new: true }).exec();
        promise.then((device) => {
            utils_1.sendJSONresponse(res, 204, device);
        }).catch((err) => {
            utils_1.sendJSONresponse(res, 404, err);
        });
    }
}
exports.DeviceController = DeviceController;
//# sourceMappingURL=device.controller.js.map