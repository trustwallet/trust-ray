const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
    address: {
        type: String,
        required: true
    },
    tokens: [{
        erc20Contract: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ERC20Contract",
            required: true
        },
        balance: {
            type: Number,
            required: true
        },
        transaction_history: [{
            transaction: {
                type: String,
                required: true
            } ,
            value: {
                type: Number,
                required: true
            }
        }]
    }]
}, {
    versionKey: false,
});

tokenSchema.plugin(mongoosePaginate);

// tokenSchema.index({address: 1}, {name: "tokenAddressIndex"});

export const Token = mongoose.model("Token", tokenSchema );
