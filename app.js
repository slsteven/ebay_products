var express     = require('express');
var path        = require('path');
var bodyParser  = require("body-parser");
var fs          = require("fs");
var util        = require('util');
var _           = require('underscore');
var dateFormat  = require('dateFormat');
var multer      = require('multer');

var request     = require('request');
var async       = require('async');
var xls         = require('excel');
var jsonfile    = require('jsonfile');
var ebay        = require('ebay-api');
var cheerio     = require('cheerio');

var Grid        = require('gridfs-stream');
var mongo       = require('mongodb');
var mongoose    = require('mongoose');

var chalk       = require('chalk');
var debug       = require('debug')('myapp');
var bunyan      = require('bunyan');
var bunyanMiddleware = require('bunyan-middleware');

require('newrelic');

var log = bunyan.createLogger({
  name: 'myserver',

  serializers: bunyan.stdSerializers,

  streams: [{
    stream: process.stdout,
    level: 'info',
  }]
});

//log.info('scan')

var app = express();

// set up a static file server that points to the "client" directory
app.use(express.static(path.join(__dirname, './client')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(bunyanMiddleware({ logger: log }));

require('./server/config/mongoose.js');

Grid.mongo = mongoose.mongo;
var conn = mongoose.connection;
var gfs = Grid(conn.db);

var File = mongoose.model('File')
var Res = mongoose.model('Res');

var storage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, './uploads/')
  },
  filename: function(req, file, callback) {
    var d = new Date()
    var formated_date = dateFormat(d, "mmddyyyy");
    callback(null, file.fieldname + '-' + formated_date)
  }
});

var upload = multer({ storage: storage });
require('./server/config/routes.js')(app, upload, gfs, log);



  var getHrDiffTime = function(time) {
    // ts = [seconds, nanoseconds]
    var ts = process.hrtime(time);
    // convert seconds to miliseconds and nanoseconds to miliseconds as well
    return (ts[0] * 1000) + (ts[1] / 1000000);
  };

  var outputDelay = function(interval, maxDelay) {
    maxDelay = maxDelay || 100;

    var before = process.hrtime();

    setTimeout(function() {
      var delay = getHrDiffTime(before) - interval;

      if (delay < maxDelay) {
        console.log('delay is %s', chalk.green(delay));
      } else {
        console.log('delay is %s', chalk.red(delay));
      };

      outputDelay(interval, maxDelay);
    }, interval);
  };

 // outputDelay(300);




app.listen(8000, function() {
  debug('cool stuff on: 8000')
});


