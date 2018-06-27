const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const ERC20ContractScheme = new Schema({
    address :  {
        type: String,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    totalSupply: {
        type: String,
        required: true
    },
    decimals: {
        type: Number,
        required: true
    },
    symbol: {
        type: String,
        required: true,
        index: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    enabled: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    versionKey: false,
});

ERC20ContractScheme.plugin(mongoosePaginate);

export const ERC20Contract = mongoose.model("ERC20Contract", ERC20ContractScheme);