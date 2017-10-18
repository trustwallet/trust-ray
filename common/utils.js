/** *********************************************************
 * @file utils.js
 * @author Philipp Rieger
 *
 * @summary Provides utilities across the project.
 * *********************************************************/


/**
 * Fills the status and JSOn data into a response object.
 * @param res response object
 * @param status of the response
 * @param content of the response
 */
module.exports.sendJSONresponse = function(res, status, content) {
  res.status(status);
  res.json(content);
};


/**
 * Retrieves all transactions from the blockchain for a given address
 * @param address
 */
module.exports.retrieveTransactionsFromBlockchain = function(address) {
  // TODO
};

/**
 * * Retrieves all tokens from the blockchain for a given address
 * @param address
 */
module.exports.retrieveTokensFromBlockchain = function(address) {
  // TODO
};