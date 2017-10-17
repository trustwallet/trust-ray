/** *************************************************************************
 * @file api.js
 * @author Philipp Rieger
 *
 * @summary Provides routes.
 * **************************************************************************/


// load required modules
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

// setup the auth object
var auth = jwt({
  secret: "thisIsSecret",         // TODO: in production set env var and use: process.env.JWT_SECRET,
  userProperty: 'payload'
});


// load controllers
var ctrlToken = require('../controllers/token.controller');
var ctrlTransaction = require('../controllers/transaction.controller');

// URLs for token
router.get('/tokens', ctrlToken.readAllTokens);
router.get('/tokens/:tokenId', ctrlToken.readOneToken);

// URLs for transactions
router.get('/transactions', ctrlTransaction.readAllTransactions);
router.get('/transactions/:transactionId', ctrlTransaction.readOneTransaction);

module.exports = router;