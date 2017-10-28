const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const deviceSchema = new Schema({
    token: {
      type: String,
      required: true
    },
    wallets: [{
        address: {
            type: String,
            required: true
        },
        transactions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction",
            required: true
        }]
    }]
});

export const Device = mongoose.model("Device", deviceSchema );
