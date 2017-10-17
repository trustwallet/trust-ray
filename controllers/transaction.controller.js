/** ***************************************************************************
 * @file transaction.controller.js
 * @author Philipp Rieger
 *
 * @summary Provides CRUD operations for the transaction resource endpoint.
 * ****************************************************************************/


// load required modules
var mongoose = require('mongoose');
var Transaction = mongoose.model('Transaction');


/**
 * Reads one transaction.
 * @param req
 * @param res
 */
module.exports.readOneTransaction = function(req, res) {
};

/**
 * Reads all transactions.
 * @param req
 * @param res
 */
module.exports.readAllTransactions= function(req, res) {
};