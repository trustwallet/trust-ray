const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const latestBlockSchema = new Schema({
    latestBlock: {
        type: Number,
        required: true
    }
});

const LatestBlock = mongoose.model("LatestBlock", latestBlockSchema );

export {
    LatestBlock
};