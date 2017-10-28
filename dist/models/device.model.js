"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const deviceSchema = new Schema({
    token: {
        type: String,
        required: true
    },
    wallets: [String]
});
exports.Device = mongoose.model("Device", deviceSchema);
//# sourceMappingURL=device.model.js.map