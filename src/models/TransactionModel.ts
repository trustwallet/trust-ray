import { LocalizedOperationConverter } from "../common/operations/LocalizedOperationConverter";

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
        required: true,
        index: true
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
    error: {
        type: String
    },
    operations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransactionOperation"
    }]

}, {
    versionKey: false,
    toObject: {
         virtuals: true
        },
    toJSON: {
        virtuals: true
    }
});


transactionSchema.virtual("operations_localized").get(function() {
    return LocalizedOperationConverter.from(this.operations);
});

transactionSchema.virtual("success").get(function() {
    if (this.hasOwnProperty("error")) {
        return this.error === "";
    }
});

transactionSchema.plugin(mongoosePaginate);

export const Transaction = mongoose.model("Transaction", transactionSchema );