/** *********************************************************
 * @file transaction.model.js
 * @author Philipp Rieger
 *
 * @summary Model class for a transaction.
 * *********************************************************/


// load required modules
var mongoose = require('mongoose');

// define the model schema
var transactionSchema = new mongoose.Schema({
  blockNumber: {
    type: String,
    required: true
  },
  timeStamp: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true
  },
  nonce: {
    type: String,
    required: true
  },
  blockHash: {
    type: String,
    required: true
  },
  transactionIndex: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  gas: {
    type: String,
    required: true
  },
  gasPrice: {
    type: String,
    required: true
  },
  isError: {
    type: String,
    required: true
  },
  input: {
    type: String,
    required: true
  },
  contractAddress: {
    type: String,
    required: true
  },
  cumulativeGasUsed: {
    type: String,
    required: true
  },
  gasUsed: {
    type: String,
    required: true
  },
  confirmations: {
    type: String,
    required: true
  }
});

// compile the schema into a model
mongoose.model('Transaction', transactionSchema);