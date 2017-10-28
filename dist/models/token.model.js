"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const tokenSchema = new Schema({
    address: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    totalSupply: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    decimals: {
        type: Number,
        required: true
    }
});
exports.Token = mongoose.model("Token", tokenSchema);
//# sourceMappingURL=token.model.js.map