var mongoose = require('mongoose');
var fs = require('fs');
// require path for getting the models path
var path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
// mongoose.connect('mongodb://localhost/discussion_board')

if (process.env.NODE_ENV == 'development') {
    mongoose.connect('mongodb://localhost/ebay_query');
} else {
  mongoose.connect(
    [
      'mongodb://heroku_rp5s8fcj:k6sg2q0428uovkhtorgd22temt@ds011429.mlab.com:11429/heroku_rp5s8fcj',
    ].join('')
  );
}
// create a variable that points to the path where all of the models live
var models_path = path.join(__dirname, '../models');
// read all of the files in the models_path and require (run) each of the javascript files
fs.readdirSync(models_path).forEach(function(file) {
  if(file.indexOf('.js') >= 0) {
    // require the file (this runs the model file which registers the schema)
    require(models_path + '/' + file);
  }
});
