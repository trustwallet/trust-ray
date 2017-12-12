import  * as express from "express";
import { TransactionController } from "../controllers/TransactionController";
import { TokenController } from "../controllers/TokenController";
import { StatusController } from "../controllers/StatusController";
import { PendingTransactionController } from "../controllers/PendingTransactionController";

const router = express["Router"]();

// load controllers
const transactionController = new TransactionController();
const tokenController = new TokenController();
const statusController = new StatusController();
const pendingTransactionController = new PendingTransactionController();
// define the routes

// URLs for transactions
router.get("/", statusController.getStatus);
router.get("/transactions", transactionController.readAllTransactions);
router.get("/transactions/:transactionId", transactionController.readOneTransaction);

//URLs for pending transactions
router.get("/pendingTransactions", pendingTransactionController.getPendingTransactions);

// URLs for tokens
router.get("/tokens", tokenController.readAllTokens);
router.get("/tokens/:tokenWalletAddress", tokenController.readOneToken);

export {
    router
};