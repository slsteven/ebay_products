var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FileSchema = new mongoose.Schema({
  scan_date: {type: Date, default: new Date},
  file_name: String,
  user: String,
  original: [],
  output: []
})

mongoose.model('File', FileSchema);
// var File = mongoose.model('File')


module.exports = mongoose.model('File', FileSchema);
