const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletSchema = new Schema({
    address: {

    },
    tokens: [

    ]
});

export const Wallet = mongoose.model("Wallet", walletSchema );
