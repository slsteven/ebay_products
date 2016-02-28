var express     = require('express');
var app         = express();
var path        = require('path');
var bodyParser  = require("body-parser");
var fs          = require("fs");
var cheerio     = require('cheerio');
var request     = require('request');
var xls         = require('excel');
var jsonfile    = require('jsonfile');
var util        = require('util');
var _           = require('underscore');
var async       = require('async');
var multer      = require('multer');
var ebay        = require('ebay-api');
var dateFormat  = require('dateFormat');

var Grid        = require('gridfs-stream');
var mongo       = require('mongodb');
var mongoose = require('mongoose');



var query_ebay = require('./server/test/test')

// set up a static file server that points to the "client" directory
app.use(express.static(path.join(__dirname, './client')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
})

var upload = multer({storage: storage});
require('./server/config/routes.js')(app, upload, gfs);


app.listen(8000, function() {
  console.log('cool stuff on: 8000');
});


