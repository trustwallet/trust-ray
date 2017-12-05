const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notParsableContractsScheme = new Schema({
    address :  {
        type: String
    }
}, {
    versionKey: false,
});

export const NotParsableContracts = mongoose.model("NotParsableContracts", notParsableContractsScheme);