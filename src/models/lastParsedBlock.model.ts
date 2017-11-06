const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lastParsedBlockSchema = new Schema({
    lastBlock: {
        type: Number,
        required: true
    }
}, {
    versionKey: false,
});

export const LastParsedBlock = mongoose.model("LastParsedBlock", lastParsedBlockSchema );