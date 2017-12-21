import  * as express from "express";
import { TransactionController } from "../controllers/TransactionController";
import { TokenController } from "../controllers/TokenController";
import { StatusController } from "../controllers/StatusController";
import { Pusher } from "../controllers/PusherController";

const router = express["Router"]();

// load controllers
const transactionController = new TransactionController();
const tokenController = new TokenController();
const statusController = new StatusController();
const pusherController = new Pusher();
// define the routes

// URLs for transactions
router.get("/", statusController.getStatus);
router.get("/transactions", transactionController.readAllTransactions);
router.get("/transactions/:transactionId", transactionController.readOneTransaction);

// URLs for tokens
router.get("/tokens", tokenController.readAllTokens);
router.get("/tokens/:tokenWalletAddress", tokenController.readOneToken);

//URLs for push notifications
router.post("/register", pusherController.register);
router.delete("/unregister", pusherController.unregister);

export {
    router
};