const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const latestBlockSchema = new Schema({
    latestBlock: {
        type: Number,
        required: true
    }
});

export const LatestBlock = mongoose.model("LatestBlock", latestBlockSchema );