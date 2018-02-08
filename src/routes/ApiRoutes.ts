import  * as express from "express";
import { TransactionController } from "../controllers/TransactionController";
import { TokenController } from "../controllers/TokenController";
import { StatusController } from "../controllers/StatusController";
import { Pusher } from "../controllers/PusherController";
import { PriceController } from "../controllers/PriceController";
import { TokenPriceController } from "../controllers/TokenPriceController";

const router = express["Router"]();

const transactionController = new TransactionController();
const tokenController = new TokenController();
const statusController = new StatusController();
const pusherController = new Pusher();
const priceController = new PriceController();
const tokenPriceController = new TokenPriceController();

// URLs for transactions
router.get("/", statusController.getStatus);
router.get("/transactions", transactionController.readAllTransactions);
router.get("/transactions/:transactionId", transactionController.readOneTransaction);

// URLs for tokens
router.get("/tokens", tokenController.readAllTokens);
router.get("/tokens/:tokenWalletAddress", tokenController.readOneToken);

// URLs for push notifications
router.post("/push/register", pusherController.register);
router.delete("/push/unregister", pusherController.unregister);

router.get("/prices", priceController.getPrices);
router.post("/tokenPrices", tokenPriceController.getTokenPrices);


export {
    router
};