"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const walletSchema = new Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true
    }
});
exports.Wallet = mongoose.model("Wallet", walletSchema);
//# sourceMappingURL=wallet.model.js.map