"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
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
    blockHash: {
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
});
exports.Transaction = mongoose.model("Transaction", transactionSchema);
//# sourceMappingURL=transaction.model.js.map