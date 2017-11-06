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
}, {
    versionKey: false,
});

export const Network = mongoose.model("Network", networkSchema );
