"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const transaction_controller_1 = require("../controllers/transaction.controller");
const token_controller_1 = require("../controllers/token.controller");
const router = express["Router"]();
exports.router = router;
// load controllers
const transactionController = new transaction_controller_1.TransactionController();
const tokenController = new token_controller_1.TokenController();
// define the routes
// URLs for transactions
router.get("/transactions", transactionController.readAllTransactions);
router.get("/transactions/:transactionId", transactionController.readOneTransaction);
// URLs for tokens
router.get("/tokens", tokenController.readAllTokens);
router.get("/tokens/:tokenId", tokenController.readOneToken);
//# sourceMappingURL=api.js.map