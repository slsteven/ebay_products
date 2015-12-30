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
  var original = 'output.json';
  original = jsonfile.readFileSync(original);
  console.log("length", output.length, original.length)
  for(var x in original){
    for(var y in output){
      console.log(x, y);
      if(x === y){

      }
      if(original[x].status == output[y].status){
        original[x].availability_check = "pass";
      }
      if(original[x].status !== output[y].status){
        original[x].availability_check = "fail";
      }
      if(original[x].product_name == output[y].product_name){
        original[x].product_name_check = "pass";
      }
      if(original[x].product_name !== output[y].product_name){
        original[x].product_name_check = "fail";
      }
      // switch (original[x].Item_ID == output[y].Item_ID) {
      //   case (original[x].status == output[y].status):
      //     original[x].availability_check = "pass";
      //     break;
      //   case (original[x].status !== output[y].status):
      //     original[x].availability_check = "fail";
      //     break;
      //   case (original[x].product_name == output[y].product_name):
      //     original[x].product_name_check = "pass";
      //     break;
      //   case (original[x].product_name !== output[y].product_name):
      //     original[x].product_name_check = "fail";
      //   }  break;
    }
  }
  console.log(original);
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
        console.log("listing price", data.text());
        list_price = data.text().slice(4);
        json.list_price = list_price;
      })

      $('.msgTextAlign').filter(function(){
        var data = $(this);
        status = data.text()
        json.status = status;
      })
      arr.push(json);
      console.log(arr)
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


