var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MessageSchema = new mongoose.Schema({
  to: String,
  from: String,
  body: String,
  created_at: {type: Date, default: new Date},
  fromCity: String,
  fromState: String,
  sid: String,
  _tabb: {type: Schema.Types.ObjectId, ref: 'Tabb'},
  _business: {type: Schema.Types.ObjectId, ref: 'Business'}

});

mongoose.model('Message', MessageSchema);
