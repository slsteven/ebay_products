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
var _ = require('underscore');

app.get('/scrape', function(req, res){
  //convert excel to json
  xls('top_trending.xlsx', function(err, data) {
    if(err) {
      console.log("error converting")
    }
    else {
      original_json = convertToJSON(data);
      // fs.writeFile("original.json", JSON.stringify(original_json, null, 4), function(err){
      // console.log("fille succesfully written")
      // })
      var arr = [];
      for(var item in original_json){
        url = original_json[item].ebay_url;
        console.log("URLL", url);
        get_item(url);
      }
    }
  })
  res.send('Check your console!')
})


app.get('/read_file', function(req, res){
  var output = 'output.json';
  output = jsonfile.readFileSync(output);

  var original = 'original.json';
  original = jsonfile.readFileSync(original);

  var sorted_output = _.sortBy(output, 'Item_ID');
  var sorted_original = _.sortBy(original, 'Item_ID');
  console.log("length", output.length, original.length)

  for(var x in sorted_original){
    var pick_from_original = _.pick(sorted_original[x], 'Item_ID', 'product_name', 'list_price', 'status');
    var check_id = _.isMatch(pick_from_original, sorted_output[x].Item_ID)
    if(check_id){
      for(var y in pick_from_original){
        switch (true) {
          case (y === 'product_name'):
            if(sorted_output[x][y] == pick_from_original[y]){
              sorted_output[x].check_product_name = "pass";
            }
            else{
              sorted_output[x].check_product_name = "fail";
            }
          case (y === 'list_price'):
            if(sorted_output[x][y] == pick_from_original[y]){
              sorted_output[x].check_list_price = "pass";
            }
            else{
              sorted_output[x].check_list_price = "fail";
            }
          break;
        }
      }
    }
  }
  console.log(sorted_output);
  // fs.writeFile("./client/static/json/result.json", 'var result = ' + JSON.stringify(sorted_output, null, 4), function(err){
  //   console.log("fille succesfully written")
  // })
})



function convertToJSON(array) {
  var first = array[0].join()
  var headers = first.split(',');

  var jsonData = [];
  for ( var i = 1, length = array.length; i < length; i++ )
  {
    var myRow = array[i].join();
    var row = myRow.split(',');

    var data = {};
    for ( var x = 0; x < row.length; x++ )
    {
      data[headers[x]] = row[x];
    }
    jsonData.push(data);
  }
  return jsonData;
};

var arr = [];
function get_item(url){
  request(url, function(error, response, html){
  //check for errors
    if(!error){
      //utilize the cheerio library on returned html
      var $ = cheerio.load(html);
      var id = url.slice(20);
      var json = {
        Item_ID: id,
        product_name: "",
        list_price: "",
        status: ""
      }

      //Using unique class as starting point
      $('.it-ttl').filter(function(){
        //store data we filter into a variable
        var data = $(this);
        // json = {product_name: ""};
        prod_name = data.text().slice(16);
        //store as json object
        json.product_name = prod_name;
      })

      $('#prcIsum').filter(function(){
        var data = $(this);
        list_price = data.text().slice(4);
        json.list_price = list_price;
      })

      $('.msgTextAlign').filter(function(){
        var data = $(this);
        status = data.text()
        json.status = status;
      })
      arr.push(json);
      // JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
      // Parameter 3 :  callback function - a callback function to let us know the status of our
      // fs.appendFile('output.json', JSON.stringify(arr, null, 4), 'utf-8', function(err){
      //   if(err){
      //     console.log("fille error when writing")
      //   }
      //})
    }
  })
}


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
// require('./server/config/mongoose.js');
// require('./server/config/routes.js')(app);

// set up a static file server that points to the "client" directory
app.use(express.static(path.join(__dirname, './client')));

app.listen(8000, function() {
  console.log('cool stuff on: 8000');
});


