import { Document, model, Schema } from "mongoose";
import { IDevice } from "../controllers/Interfaces/IPusherController"

const deviceSchema = new Schema({
    deviceID: {
        type: String,
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true
    },
    wallets: {
        type: [String],
        required: true,
        index: true
    },
    type: {
        type: String
    }
  }, {
    timestamps: true,
    versionKey: false,
  });

  export const Device = model<IDevice & Document>("Device", deviceSchema);