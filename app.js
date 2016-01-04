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
var async = require('async');
var multer = require('multer');
var ebay = require('ebay-api');

app.post('/scrape', multer({ dest: './uploads/'}).single('upl'), function(req, res){
  //convert excel to json
  xls('./uploads/'+req.file.filename, function(err, data) {
    if(err) {
      console.log("error converting")
    }
    else {
      original_json = convertToJSON(data);
      fs.writeFile("original.json", JSON.stringify(original_json, null, 4),

      function(err){
        console.log("fille succesfully written");
        res.status(204).end();
      })
    }
  })
})



 var params = {
        keywords: ["301803182706"],
        // add additional fields
        outputSelector: ['AspectHistogram'],

        paginationInput: {
          entriesPerPage: 1
        }
      };
      ebay.xmlRequest({
        serviceName: 'Finding',
        opType: 'findItemsByKeywords',
        appId: 'RideSnap-b66a-448f-9063-46ba6dbe1a3e',
        params: params,
        parser: ebay.parseResponseJson    // (default)
      },
      // gets all the items together in a merged array
      function itemsCallback(error, itemsResponse) {
        //console.log(_.has(itemsResponse.searchResult.item.discountPriceInfo.originalRetailPrice, "amount"))
        console.log(_.has(itemsResponse.searchResult.item, "discountPriceInfo"))
       //console.log(itemsResponse.searchResult.item.discountPriceInfo)
      })

app.get('/get_results', function(req, res){
  get_item(function(data){

  var output = 'output.json';
  output = jsonfile.readFileSync(output);

  var original = 'original.json';
  original = jsonfile.readFileSync(original);

  var sorted_output = _.sortBy(output, 'Item_ID');
  var sorted_original = _.sortBy(original, 'Item_ID');


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
  fs.writeFile("./client/static/json/result.json", 'var result = ' + JSON.stringify(sorted_output, null, 4), function(err){
    console.log("fille succesfully written")

  })
})
console.log("END")
res.status(204).end();
})


function get_item(callback2){
  var original = 'original.json'
  var original_json = jsonfile.readFileSync(original);
  var array_of_urls = [];

  for(var item in original_json){
    url = original_json[item].Item_ID;
    array_of_urls.push(url);
  }
  var arr = [];
  async.eachSeries(array_of_urls,
    function(url, callback){
     var json = {
        Item_ID: "",
        product_name: "",
        list_price: "",
        msrp: "",
        status: "",
        galleryURL: ""
      }
      var params = {
        keywords: [url],
        // add additional fields
        outputSelector: ['AspectHistogram'],

        paginationInput: {
          entriesPerPage: 1
        }
      };
      ebay.xmlRequest({
        serviceName: 'Finding',
        opType: 'findItemsByKeywords',
        appId: 'RideSnap-b66a-448f-9063-46ba6dbe1a3e',
        params: params,
        parser: ebay.parseResponseJson    // (default)
      },
      // gets all the items together in a merged array
      function itemsCallback(error, itemsResponse) {
        if(itemsResponse.searchResult.$.count == 0){
          request("http://ebay.com/itm/"+url, function(error, response, html){
          console.log(error);
          //check for errors
            if(!error){
              //utilize the cheerio library on returned html
              var $ = cheerio.load(html);
              var id = url.slice(20);
              //Using unique class as starting point
              $('.msgTextAlign').filter(function(){
                var data = $(this);
                status = data.text()
                json.status = status;
                json.Item_ID = url;
              })
            }
          arr.push(json);
          callback();
          })
        }
        else{
        json = {
          Item_ID: itemsResponse.searchResult.item.itemId,
          product_name: itemsResponse.searchResult.item.title,
          list_price: itemsResponse.searchResult.item.sellingStatus.currentPrice.amount,
          status: itemsResponse.searchResult.item.sellingStatus.sellingState,
          galleryURL: itemsResponse.searchResult.item.galleryURL
        }

        if(_.has(itemsResponse.searchResult.item, "discountPriceInfo")){
          json.msrp = itemsResponse.searchResult.item.discountPriceInfo.originalRetailPrice.amount
        }
        arr.push(json)
        callback();
        }
      });
    },
    function (error){
      console.log("DONE", arr, arr.length);
      // JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make JSON easier to read
      // Parameter 3 :  callback function - a callback function to let us know the status of our
      fs.writeFile('output.json', JSON.stringify(arr, null, 4), 'utf-8',
      function(err){
        if(err){
          console.log("fille error when writing")
        }
       callback2("complete")
      })
    })
  console.log("orig leng", original_json.length)
}


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


// function get_item(callback2){
//   var original = 'original.json'
//   var original_json = jsonfile.readFileSync(original);
//   var array_of_urls = [];
//   for(var item in original_json){
//     url = original_json[item].ebay_url;
//     array_of_urls.push(url);
//   }
//   var arr = [];
//   async.each(array_of_urls,
//     function(url, callback){
//         request(url, function(error, response, html){
//           console.log(error);
//         //check for errors
//           if(!error){
//             console.log("SDFKJD", arr.length)
//             //utilize the cheerio library on returned html
//             var $ = cheerio.load(html);
//             var id = url.slice(20);
//             var json = {
//               Item_ID: id,
//               product_name: "",
//               list_price: "",
//               status: ""
//             }
//             //Using unique class as starting point
//             $('.it-ttl').filter(function(){
//               //store data we filter into a variable
//               var data = $(this);
//               // json = {product_name: ""};
//               prod_name = data.text().slice(16);
//               //store as json object
//               json.product_name = prod_name;
//             })
//             $('#prcIsum').filter(function(){
//               var data = $(this);
//               list_price = data.text().slice(4);
//               json.list_price = list_price;
//             })
//             $('.msgTextAlign').filter(function(){
//               var data = $(this);
//               status = data.text()
//               json.status = status;
//             })
//             arr.push(json);
//           }
//           callback();
//         })
//       },
//     function (error){
//       console.log("DONE", arr, arr.length);
//       // JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make JSON easier to read
//       // Parameter 3 :  callback function - a callback function to let us know the status of our
//       fs.writeFile('output.json', JSON.stringify(arr, null, 4), 'utf-8',
//       function(err){
//         if(err){
//           console.log("fille error when writing")
//         }
//         callback2("complete")
//       })
//     })
// }


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
// require('./server/config/mongoose.js');
// require('./server/config/routes.js')(app);

// set up a static file server that points to the "client" directory
app.use(express.static(path.join(__dirname, './client')));

app.listen(8000, function() {
  console.log('cool stuff on: 8000');
});


