const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const ERC721ContractScheme = new Schema({
    address :  {
        type: String,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    symbol: {
        type: String,
        required: true,
        index: true
    },
    totalSupply: {
        type: String,
        required: true
    },
    implementsERC721: {
        type: Number,
        required: true
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

// indices
ERC721ContractScheme.index({address: 1}, {name: "contractAddressIndex"});
ERC721ContractScheme.index({symbol: 1}, {name: "contractSymbolIndex"});
ERC721ContractScheme.index({name: 1}, {name: "contractNameIndex"});

ERC721ContractScheme.plugin(mongoosePaginate);

export const ERC721Contract = mongoose.model("ERC721Contract", ERC721ContractScheme);