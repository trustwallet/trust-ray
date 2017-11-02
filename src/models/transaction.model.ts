const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    blockNumber: {
        type: String,
        required: true
    },
    timeStamp: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true
    },
    nonce: {
        type: String,
        required: true
    },
    transactionIndex: {
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
    gas: {
        type: String,
        required: true
    },
    gasPrice: {
        type: String,
        required: true
    },
    input: {
        type: String,
        required: true
    },
    gasUsed: {
        type: String,
        required: true
    }
}, { versionKey: false });

transactionSchema.plugin(mongoosePaginate);

transactionSchema.index({hash: 1}, {unique: true});
transactionSchema.index({from: 1});
transactionSchema.index({to: 1});

export const Transaction = mongoose.model("Transaction", transactionSchema );
