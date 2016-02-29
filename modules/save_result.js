var mongoose    = require('mongoose')
var File        = mongoose.model('File')
var Res         = mongoose.model('Res');
var _           = require('underscore');



var save_result = function (ress, filename, callback) {
  File.findOne({file_name: filename}, function(err, result) {
    var output = result.output;
    var original = result.original;
    console.log("LENGTHHHH_______", output.length, original.length)
    var sorted_output = _.sortBy(output, 'ebay_Item_ID');
    sorted_output.shift();
    var sorted_original = _.sortBy(original, 'Item_ID');

    for (var x in sorted_original){
      if (sorted_original[x].Item_ID != undefined) {
        sorted_output[x] = _.extend(sorted_output[x], sorted_original[x]);
      }
    }

    Res.findOne({file_name: result.originalname}, function(err, file){
      console.log("SDF", file)
      if (file == null) {
        var new_res = new Res({
          user: result.user,
          file_name: result.file_name,
          result: sorted_output
        })
        new_res.save(function(err, result) {
          if (err) {
            console.log("result did no save");
          } else {
            callback(sorted_output);
          }
        })
      } else {
        //res.send({result: sorted_output});
      }
    })
  })
}



module.exports = save_result;
