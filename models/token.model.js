/** *********************************************************
 * @file token.model.js
 * @author Philipp Rieger
 *
 * @summary Model class for a token.
 * *********************************************************/


// load required modules
var mongoose = require('mongoose');

// define the model schema
var tokenSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  totalSupply: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  decimals: {
    type: Number,
    required: true
  }
});

// compile the schema into a model
mongoose.model('Token', tokenSchema);