const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const walletSchema = new Schema({
    address: {
        type: String,
        required: true,
        unique: true
    },
    ethBalance: {
        type: Number,
        required: true
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

walletSchema.plugin(mongoosePaginate);

walletSchema.index({address: 1});

export const Wallet = mongoose.model("Wallet", walletSchema );
