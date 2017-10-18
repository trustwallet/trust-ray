/** *********************************************************
 * @file utils.js
 * @author Philipp Rieger
 *
 * @summary Provides utilities across the project.
 * *********************************************************/


var Web3 = require('web3');
var util = require('ethereumjs-util');
var tx = require('ethereumjs-tx');
var web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk'));
//var testAddress = '0x4b10b4479c0a62a1c1a5422b9295c765ae6fe42f';

var mongoose = require('mongoose');
var Transaction = mongoose.model('Transaction');


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
 * Returns the balance for a given address.
 * @param address
 * @returns {*}
 */
module.exports.getBalanceForAddress = function(address) {

  if(!web3.isConnected()) {
    console.log('Not connected to Ethereum network.');
  } else {
    var balanceWei = web3.eth.getBalance(address).toNumber();
    var balance = web3.fromWei(balanceWei, 'ether');
    console.log("Balance: " + balance);
    return balance;
  }
  return 0;
};

/**
 * Retrieves all transactions from the blockchain for a given address
 * @param address
 * @param startBlockNumber
 * @param endBlockNumber
 */
module.exports.retrieveLatestTransactionsFromBlockchain = function(address, startBlockNumber, endBlockNumber) {

  if(!web3.isConnected()) {
    console.log('Not connected to Ethereum network.');
  } else {

    // get all transactions for this address
    if (endBlockNumber === undefined) {
      endBlockNumber = web3.eth.blockNumber;
    }
    if (startBlockNumber === undefined) {
      startBlockNumber = endBlockNumber - 1000;
    }

    console.log("For address: " + address);

    for (var i = startBlockNumber; i <= endBlockNumber; i++) {
      if (i % 10 === 0) {
        console.log("Searching block " + i);
      }

      var block = web3.eth.getBlock(i, true);
      if (block !== null && block.transactions !== null) {

        block.transactions.forEach(function (e) {

          if (address === e.from || address === e.to) {
            console.log("  tx hash          : " + e.hash + "\n"
              + "   nonce           : " + e.nonce + "\n"
              + "   blockHash       : " + e.blockHash + "\n"
              + "   blockNumber     : " + e.blockNumber + "\n"
              + "   transactionIndex: " + e.transactionIndex + "\n"
              + "   from            : " + e.from + "\n"
              + "   to              : " + e.to + "\n"
              + "   value           : " + e.value + "\n"
              + "   time            : " + block.timestamp + " " +
                new Date(block.timestamp * 1000).toGMTString() + "\n"
              + "   gasPrice        : " + e.gasPrice + "\n"
              + "   gas             : " + e.gas + "\n"
              + "   input           : " + e.input);

            // persist
            var transaction_data = {
              blockNumber: String(e.blockNumber),
              timeStamp: String(block.timestamp),
              hash: String(e.hash),
              nonce: String(e.nonce),
              blockHash: String(block.hash),
              transactionIndex: String(e.transactionIndex),
              from: String(e.from),
              to: String(e.to),
              value: String(e.value),
              gas: String(e.gas),
              gasPrice: String(e.gasPrice),
              input: String(e.input),
              gasUsed: String(block.gasUsed)
            };

            // check if tx already exists
            Transaction.find({hash : transaction_data.hash}, function (err, docs) {
              if (docs.length){
                console.log("Transaction already exists in DB");
              }else{

                // create it if not stored yet
                Transaction.create(transaction_data, function callback(err, transaction) {
                  if (err) {
                    console.log("Error: " + error);
                  } else {
                    console.log("Success saving: " + transaction);
                  }
                });
              }
            });
          }
        })
      }
    }
  }
};

/**
 * * Retrieves all tokens from the blockchain for a given address
 * @param address
 */
module.exports.retrieveTokensFromBlockchain = function(address) {
  // TODO
};