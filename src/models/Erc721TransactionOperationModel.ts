const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Model for a transaction action
 * specifying the purpose of a
 * transaction.
 *
 * @type {"mongoose".Schema}
 */
const transactionOperationSchema = new Schema({
    transactionId: {
        type: String,
        required: true,
        index: true
    },
    type: {
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
    contract: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ERC721Contract",
        required: true
    }
}, {
    versionKey: false
});

export const ERC721TransactionOperation = mongoose.model("ERC721TransactionOperation", transactionOperationSchema );