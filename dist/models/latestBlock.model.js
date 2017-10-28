"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const latestBlockSchema = new Schema({
    latestBlock: {
        type: Number,
        required: true
    }
});
exports.LatestBlock = mongoose.model("LatestBlock", latestBlockSchema);
//# sourceMappingURL=latestBlock.model.js.map