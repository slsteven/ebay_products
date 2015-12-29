var express   = require('express');
var app       = express();
var path      = require('path');
var bodyParser = require("body-parser");
var fs = require("fs");
var cheerio = require('cheerio');
var request = require('request');
var xls = require('excel');
var util = require('util')

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
var json;

function get_item(url){

  request(url, function(error, response, html){
  //check for errors
    if(!error){
      //utilize the cheerio library on returned html
      var $ = cheerio.load(html);
      //define variable we are going to capture

      //use the unique header class as a starting point
      $('.it-ttl').filter(function(){
        //store data we filter into a variable
        var data = $(this);
        // json = {product_name: ""};
        //examine the DOM
        title = data.text().slice(16);
        //store title to json object
        json = {
          product_name: title
        }
        arr.push(json);
        // console.log("inside method", json);
      })
      console.log(arr)
      fs.writeFileSync('output.json', JSON.stringify(arr, null, 4), 'utf-8', function(err){
        console.log("fille succesfully written")
      })
    }
  })
}

app.get('/scrape', function(req, res){
  //convert excel to json
  xls('top_trending.xlsx', function(err, data) {
    if(err) {
      console.log("error converting")
    }
    else{
      original_json = convertToJSON(data);
      var arr = [];
      for(var item in original_json){
      // fs.writeFile("original.json", JSON.stringify(original_json, null, 4), function(err){
      // console.log("fille succesfully written")
      // })
        url = original_json[item].ebay_url;
        console.log("URLL", url);

        var x = get_item(url);
        // To write to the system we will use the built in 'fs' library.
        // In this example we will pass 3 parameters to the writeFile function
        // Parameter 1 :  output.json - this is what the created filename will be called
        // Parameter 2 :  JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
        // Parameter 3 :  callback function - a callback function to let us know the status of our function
      // fs.writeFile("output.json", JSON.stringify(json, null, 4), function(err){
      //   console.log("fille succesfully written")
      // })

      }
    }
  })
  res.send('Check your console!')
})


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
// require('./server/config/mongoose.js');
// require('./server/config/routes.js')(app);


// set up a static file server that points to the "client" directory
app.use(express.static(path.join(__dirname, './client')));

app.listen(8000, function() {
  console.log('cool stuff on: 8000');
});


