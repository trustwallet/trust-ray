const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const deviceSchema = new Schema({
    token: {
        type: String,
        required: true
    },
    wallets: [String]
});

export const Device = mongoose.model("Device", deviceSchema );
