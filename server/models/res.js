var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ResSchema = new mongoose.Schema({
  file_name: String,
  scan_date: {type: Date, default: new Date},
  user: String,
  result: []
})

mongoose.model('Res', ResSchema);
var Res = mongoose.model('Res');
