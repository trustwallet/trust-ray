const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
    address: {
        type: String,
        required: true,
        unique: true
    },
    tokens: [{
        contractAddress: {
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
        balance: {
            type: Number,
            required: true
        }
    }]
});

tokenSchema.plugin(mongoosePaginate);

tokenSchema.index({address: 1});

export const Token = mongoose.model("Token", tokenSchema );
