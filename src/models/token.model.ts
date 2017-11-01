const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
    address: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    totalSupply: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    decimals: {
        type: Number,
        required: true
    }
});

tokenSchema.plugin(mongoosePaginate);

export const Token = mongoose.model("Token", tokenSchema );
