const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;


/**
 * Model for a single transaction.
 *
 * @type {"mongoose".Schema}
 */
const transactionSchema = new Schema({
    _id: {
        type: String,
        required: true
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
        required: true
    },
    to: {
        type: String,
        required: true
    },
    addresses: [{
        type: String,
        index: true
    }],
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
    },
    operation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransactionOperation"
    }

}, {
    versionKey: false
});

transactionSchema.plugin(mongoosePaginate);

// INDICES
// transactionSchema.index({hash: 1});
// transactionSchema.index({from: 1});
// transactionSchema.index({to: 1});
// transactionSchema.index({timeStamp: -1});


export const Transaction = mongoose.model("Transaction", transactionSchema );