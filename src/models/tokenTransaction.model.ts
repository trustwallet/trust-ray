const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenTransactionSchema = new Schema({
    contract: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
});

export const TokenTransaction = mongoose.model("TokenTransaction", tokenTransactionSchema );
