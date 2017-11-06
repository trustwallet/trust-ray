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
            required: true,
            index: true
        },
        balance: {
            type: Number,
            required: true
        }
    }]
}, {
    versionKey: false,
});

tokenSchema.plugin(mongoosePaginate);

tokenSchema.index({address: 1});

export const Token = mongoose.model("Token", tokenSchema );
