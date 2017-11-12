const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blacklistedContractScheme = new Schema({
    address :  {
        type: String
    }
}, {
    versionKey: false,
});

export const BlacklistedContract = mongoose.model("BlacklistedContract", blacklistedContractScheme);