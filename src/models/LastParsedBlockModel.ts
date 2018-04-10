const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lastParsedBlockSchema = new Schema({
    lastBlock: {
        type: Number,
        required: true
    },
    lastBackwardBlock: {
        type: Number
    },
    lastPusherBlock: {
        type: Number
    },
    lastTokensBlock: {
        type: Number
    },
    lastTokensBackwardBlock: {
        type: Number
    }
}, {
    versionKey: false,
});

export const LastParsedBlock = mongoose.model("LastParsedBlock", lastParsedBlockSchema );