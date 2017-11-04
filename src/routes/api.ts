import  * as express from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { TokenController } from "../controllers/token.controller";

const router = express["Router"]();

// load controllers
const transactionController = new TransactionController();
const tokenController = new TokenController();

// define the routes

// URLs for transactions
router.get("/transactions", transactionController.readAllTransactions);
router.get("/transactions/:transactionId", transactionController.readOneTransaction);

// URLs for tokens
router.get("/tokens", tokenController.readAllTokens);
router.get("/tokens/:tokenId", tokenController.readOneToken);


export {
    router
};