"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const networkSchema = new Schema({
    chainId: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    apiKey: {
        type: String,
        required: true
    }
});
const Network = mongoose.model("Network", networkSchema);
exports.Network = Network;
//# sourceMappingURL=network.model.js.map