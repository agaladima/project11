'use strict';

// load modules
var express = require('express');
var morgan = require('morgan');
var jsonParser = require("body-parser").json;
var mongoose = require('mongoose');
var seeder = require('mongoose-seeder'),
    data = require('./data/data.json');
var routes = require('./routes/index'); //include routes

//include mongoose models
var User = require('./models/user');
var Course = require('./models/course');

var app = express();

// mongodb connection
app.use(jsonParser());
mongoose.connect('mongodb://localhost:27017/courserating');
var db = mongoose.connection;

//mongo error
db.on('error', function(err) {
  console.error('connection error:', err);
});

db.once('open', function(){
  //connect seed data
  seeder.seed(data).then(function(dbData) {
    console.log('The database is seeded with' + dbData);
    //console.log(data.users);
  }).catch(function(err) {
    if(err) {
      console.log(err);
    }
  });
  console.log('db connection successful');
});

// seeder.connect('mongodb://localhost:27017/course-rating', function(){
//   seeder.loadModels(['src/data/data.json']);

//   seeder.clearModels(['User'], function() {
 
//     // Callback to populate DB once collections have been cleared
//     seeder.populateModels(data, function() {
//       seeder.disconnect();
//     });

//   });
// });

// set our port
app.set('port', process.env.PORT || 5000);

// morgan gives us http request logging
app.use(morgan('dev'));

// setup our static route to serve files from the "public" folder
app.use('/', express.static('public'));

//include routes
app.use('/api', routes);

// catch 404 and forward to global error handler
app.use(function(req, res, next) {
  var err = new Error('File Not Found');
  err.status = 404;
  next(err);
});

// Express's global error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message
    }
  });
});

// start listening on our port
var server = app.listen(app.get('port'), function() {
  console.log('Express server is listening on port ' + server.address().port);
});
