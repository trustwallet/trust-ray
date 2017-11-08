const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const transactionActionSchema = new Schema({
    actionType: {
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
    value: {
        type: String,
        required: true
    },
    token: {
        name: {
            type: String,
            required: true
        },
        symbol: {
            type: String,
            required: true
        },
        decimals: {
            type: Number,
            required: true
        },
        totalSupply: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            required: true
        }
    }
});

export const TransactionAction = mongoose.model("TransactionAction", transactionActionSchema );