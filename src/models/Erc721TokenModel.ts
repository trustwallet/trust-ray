const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const erc721tokenSchema = new Schema({
    _id: {
        type: String,
        required: true,
    },
    tokens: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ERC721Contract",
        required: true,
        index: true
    }]
}, {
    versionKey: false,
});

erc721tokenSchema.plugin(mongoosePaginate);

export const ERC721Token = mongoose.model("ERC721Token", erc721tokenSchema );
