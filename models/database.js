/** *********************************************************
 * @file database.js
 * @author Philipp Rieger
 *
 * @summary Handles the database management.
 * *********************************************************/


var mongoose = require( 'mongoose' );

// connect, hook into monitor events and setup shutdown handlers
var dbURI = 'mongodb://localhost/trust-wallet';                                  // TODO: change dbURI to production URI
mongoose.connect(dbURI);
hookIntoConnectionMonitorEvents(dbURI);
setupShutdownHandlers();

// load models into app
require('./transaction.model');
require('./token.model');

/**
 * Hooks into the connection monitoring events
 * connect/error/disconnect.
 * @param {string} dbURI URI of the database
 */
function hookIntoConnectionMonitorEvents(dbURI) {
  mongoose.connection.on('connected', function () {
    console.log('Mongoose connected to ' + dbURI);
  });
  mongoose.connection.on('error',function (err) {
    console.log('Mongoose connection error: ' + err);
  });
  mongoose.connection.on('disconnected', function () {
    console.log('Mongoose disconnected');
  });
}

/**
 * Shuts down the mongoose connection correctly when
 * the application terminates. Would remain open other-
 * wise.
 * @param {string} msg of the shutdown reason
 * @param callback for terminating actions
 */
function gracefulShutdown (msg, callback) {
  mongoose.connection.close(function () {
    console.log('Mongoose disconnected through ' + msg);
    callback();
  });
};

/**
 * Handles the different ways the app could shut down
 * and delegates to terminate securely.
 */
function setupShutdownHandlers() {
  // SIGUSR2 signal for nodemon shutdown
  process.once('SIGUSR2', function () {
    gracefulShutdown('nodemon restart', function callback() {
      process.kill(process.pid, 'SIGUSR2');
    });
  });
  // SIGINT signal for regular app shutdown
  process.on('SIGINT', function () {
    gracefulShutdown('app termination', function callback() {
      process.exit(0);
    });
  });
  // SIGTERM signal for Heroku shutdown
  process.on('SIGTERM', function() {
    gracefulShutdown('Heroku app shutdown', function callback() {
      process.exit(0);
    });
  });
}
