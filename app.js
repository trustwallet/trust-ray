var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var cors = require('cors');
var validator = require('express-validator');
var port = process.env.PORT || 8001;

require('./models/database');

// configure app
var app = express();
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(validator());

// set URLs for routes
var routesApi = require('./routes/api');
app.use('/api', routesApi);

setupErrorHandling(app);

// set the port manually
app.listen(port);
console.log('App started to listen on port ' + port);

module.exports = app;


function setupErrorHandling(app) {
  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
// catch unauthorized errors
  app.use(function(err, req, res, next) {
    if(err.name === 'UnauthorizedError') {
      res.status(401);
      res.json({"message": err.name + ": " + err.message});
    }
  });
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });
}