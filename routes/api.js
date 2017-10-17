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


// TODO: load controllers

// TODO: setup URLs


module.exports = router;