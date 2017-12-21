import {Document, model, Schema} from 'mongoose';

interface Device {
    deviceID: string;
    token: string;
    wallets: string[];
}

interface Device extends Document {}

const deviceSchema = new Schema({
    deviceID: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    }, 
    wallets: {
        type: [String],
        required: true
    } 
  }, {
    timestamps: true,
    versionKey: false
  });
  
  export const Device = model<Device>("Device", deviceSchema);