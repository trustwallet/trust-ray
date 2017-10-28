import  * as express from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { TokenController } from "../controllers/token.controller";
import { DeviceController } from "../controllers/device.controller";

const router = express["Router"]();

// load controllers
const transactionController = new TransactionController();
const tokenController = new TokenController();
const deviceController = new DeviceController();

// define the routes

// URLs for transactions
router.get("/transactions", transactionController.readAllTransactions);
router.get("/transactions/:transactionId", transactionController.readOneTransaction);

// URLs for tokens
router.get("/tokens", tokenController.readAllTokens);
router.get("/tokens/:tokenId", tokenController.readOneToken);

// URLs for devices
router.get("/devices", deviceController.readAllDevices);
router.get("/devices/:deviceId", deviceController.readOneDevice);
router.post("/devices", deviceController.createOneDevice);
router.patch("/devices/:deviceId", deviceController.updateOneDevice);


export {
    router
};