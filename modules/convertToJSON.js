
//method creats an array of objects.
module.exports = function convertToJSON(array) {
  var first = array[0].join()
  var headers = first.split(',');
  var jsonData = [];
  for ( var i = 1, length = array.length; i < length; i++ )
  {
    var myRow = array[i].join();
    //use regext to find when discription name ends
    //slice that name and remove all commas
    //concat reformated listing description back to original
    var n = myRow.search(/\b\d{12}\b/g);
    var new_name = myRow.slice(0, n);
    var regex = new RegExp(',', 'g');
    var beg_of_string = new_name.replace(/,/g,'');

    beg_of_string = beg_of_string + ",";
    var end_of_string = myRow.slice(n)
    myRow = beg_of_string.concat(end_of_string);

    var row = myRow.split(',');
    // console.log("ROW", row)

    var data = {};
    for ( var x = 0; x < row.length; x++ )
    {
      data[headers[x]] = row[x];
    }
    jsonData.push(data);
  }
  return jsonData;
};
