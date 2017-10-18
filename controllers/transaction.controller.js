/** ***************************************************************************
 * @file transaction.controller.js
 * @author Philipp Rieger
 *
 * @summary Provides CRUD operations for the transaction resource endpoint.
 * ****************************************************************************/


// load required modules
var mongoose = require('mongoose');
var Transaction = mongoose.model('Transaction');
var xssFilters = require('xss-filters');
var utils = require('../common/utils');

/**
 * Reads one transaction.
 * @param req
 * @param res
 */
module.exports.readOneTransaction = function(req, res) {
  if(!req.params || !req.params.transactionId) {
    utils.sendJSONresponse(res, 404, {"message": "No transaction ID in request"});
    return;
  }

  var transactionId = xssFilters.inHTMLData(req.params.transactionId);
  Transaction.findById(transactionId)
    .exec(function callback(err, transaction) {
      if(!transaction) {
        utils.sendJSONresponse(res, 404, {"message": "transaction ID not found"});
        return;
      } else if(err) {
        utils.sendJSONresponse(res, 404, err);
        return;
      }
      // success
      utils.sendJSONresponse(res, 200, transaction);
    });
};

/**
 * Reads all transactions.
 * @param req
 * @param res
 */
module.exports.readAllTransactions= function(req, res) {
  if (req.query.fromAddress) {
    var fromAddress = xssFilters.inHTMLData(req.query.fromAddress);
    Transaction.find({from: fromAddress}, function(err, transactions) {
      readAllTransactionsCallback(res, err, transactions, fromAddress)
    });
  } else {
    Transaction.find({}, function(err, transactions) {
      readAllTransactionsCallback(res, err, transactions)
    });
  }
};


// Callback functions

function readAllTransactionsCallback(res, err, transactions, fromAddress) {
  if(transactions.length === 0) {
    utils.retrieveLatestTransactionsFromBlockchain(fromAddress);
  }
  if(err) {
    utils.sendJSONresponse(res, 404, err);
  } else {
    utils.sendJSONresponse(res, 200, transactions);
  }
}