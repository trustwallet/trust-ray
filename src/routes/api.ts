import  * as express from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { TokenController } from "../controllers/token.controller";
import { StatusController } from "../controllers/status.controller";

const router = express["Router"]();

// load controllers
const transactionController = new TransactionController();
const tokenController = new TokenController();
const statusController = new StatusController();
// define the routes

// URLs for transactions
router.get("/", statusController.getStatus);
router.get("/transactions", transactionController.readAllTransactions);
router.get("/transactions/:transactionId", transactionController.readOneTransaction);

// URLs for tokens
router.get("/tokens", tokenController.readAllTokens);
router.get("/tokens/:tokenWalletAddress", tokenController.readOneToken);

export {
    router
};