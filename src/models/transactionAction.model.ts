const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Model for a transaction action
 * specifying the purpose of a
 * transaction.
 *
 * @type {"mongoose".Schema}
 */
const transactionActionSchema = new Schema({
    actionType: {
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
    erc20Contract: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ERC20Contract",
        required: true
    }
});

export const TransactionAction = mongoose.model("TransactionAction", transactionActionSchema );