const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    _id: {
        type: String,
        require: true,
    },
    blockNumber: {
        type: Number,
        required: true
    },
    timeStamp: {
        type: String,
        required: true
    },
    nonce: {
        type: Number,
        required: true
    },
    from: {
        type: String,
        required: true,
        index: true
    },
    to: {
        type: String,
        required: true,
        index: true
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
}, { versionKey: false,
     _id: false
});

transactionSchema.plugin(mongoosePaginate);

transactionSchema.index({from: 1});
transactionSchema.index({to: 1});

export const Transaction = mongoose.model("Transaction", transactionSchema );
