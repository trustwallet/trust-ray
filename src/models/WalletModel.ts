const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletSchema = new Schema({
    walletAddress: {
        type: String,
        require: true,
        index: true
    }
})

export const Wallet = mongoose.model("Wallet", walletSchema);