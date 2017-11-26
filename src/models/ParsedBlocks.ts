const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const parsedBlocksSchema = new Schema({
    lastBlock: {
        type: Number,
        required: true
    },
    latestBlock: {
        type: Number,
        required: true
    }
}, {
    versionKey: false,
});

export const ParsedBlocks = mongoose.model("ParsedBlocks", parsedBlocksSchema );