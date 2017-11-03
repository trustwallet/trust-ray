const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenTransactionSchema = new Schema({
    transaction: {
        type: String,
        required: true
    },
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
    value: {
        type: String,
        required: true
    },
},
{ 
    versionKey: false
});

tokenTransactionSchema.index({transaction: 1});

export const TokenTransaction = mongoose.model("TokenTransaction", tokenTransactionSchema );
