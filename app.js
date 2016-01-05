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
var amazon = require('amazon-product-api');
var json2csv = require('json2csv');


var params = {
        keywords: ['111856230292'],
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
        console.log("FAIL", itemsResponse.searchResult.item.sellingStatus.currentPrice.amount)
        });

var client = amazon.createClient({
  awsId: "",
  awsSecret: "",
  awsTag: ""
});

 console.log("amazon client", client)

client.itemSearch({
  keywords: 'Zmodo 8 CH HDMI DVR 4 CCTV Outdoor Home Surveillance Security Camera',
  responseGroup: 'ItemAttributes,Offers,Images'
}).then(function(results){
  console.log("results", results);
}).catch(function(err){
  console.log("errror", err);
});

app.get('/export', function(req, res){
  var result = './client/static/json/result.json';
  fs.readFile(result, 'utf8', function(err, data){
    new_result = JSON.parse(data.slice(13));

    var fields = ['ebay_Item_ID', 'Vertical', 'ebay_product_name', 'ebay_status', 'ebay_msrp', 'list_price', 'ebay_list_price', 'Seller_Name', 'Account_Manager'];

    json2csv({data: new_result, fields: fields}, function(err, csv){
      if(!err){
        fs.writeFile('file.csv', csv, function(err) {
          if (err) throw err;
          res.send("check file.csv")
          console.log('file saved');
        });
      }
    })
  })
})

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

app.get('/get_results', function(req, res){
  get_item(function(data){
  var output = 'output.json';
  output = jsonfile.readFileSync(output);

  var original = 'original.json';
  original = jsonfile.readFileSync(original);

  var sorted_output = _.sortBy(output, 'ebay_Item_ID');
  var sorted_original = _.sortBy(original, 'Item_ID');


  for(var x in sorted_original){
    var account_info = _.pick(sorted_original[x], 'Vertical', 'Seller_Name', 'Account_Manager', 'list_price');
    console.log("SLDKFJSLKDFJ ACCOUNT INFO", account_info)
    sorted_output[x] = _.extend(sorted_output[x], account_info);

    // var pick_from_original = _.pick(sorted_original[x], 'Item_ID', 'product_name', 'list_price', 'status');
    var check_id = _.isMatch(sorted_original[x], sorted_output[x].Item_ID)
    if(check_id){
      for(var y in sorted_original[x]){
        // switch (true) {
        //   case (y === 'product_name'):
        //     if(sorted_original[x].product_name == sorted_output[x].ebay_product_name){
        //       sorted_output[x].check_product_name = "pass";
        //     }
        //     else{
        //       sorted_output[x].check_product_name = "fail";
        //     }
        //   case (y === 'list_price'):
        //    console.log("yyyyyyyyyyyy", y, sorted_original[x].list_price, sorted_output[x].ebay_list_price)

        //     if(sorted_original[x].list_price == sorted_output[x].ebay_list_price){
        //       sorted_output[x].check_list_price = "pass";
        //     }
        //     else{
        //       sorted_output[x].check_list_price = "fail";
        //     }
        //   break;
        // }
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
        ebay_Item_ID: "",
        ebay_product_name: "",
        ebay_list_price: "",
        ebay_msrp: "",
        ebay_status: "",
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
        console.log("FAIL", itemsResponse)
        console.log("FAILING", itemsResponse.searchResult)
        if(itemsResponse.ack == "Failure"){
          json.ebay_Item_ID = url;
          arr.push(json);
          callback();
        }
        else if(itemsResponse.searchResult.$.count == 0){
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
                json.ebay_status = status;
                json.ebay_Item_ID = url;
              })
            }
          arr.push(json);
          callback();
          })
        }
        else{
          console.log("a;lsdkjf;alksdjf", itemsResponse.searchResult.item.discountPriceInfo)
          // console.log("a;lsdkjf;alksdjf", itemsResponse.searchResult.item.itemId)
        json = {
          ebay_Item_ID: itemsResponse.searchResult.item.itemId,
          ebay_product_name: itemsResponse.searchResult.item.title,
          ebay_list_price: itemsResponse.searchResult.item.sellingStatus.currentPrice.amount,
          ebay_status: itemsResponse.searchResult.item.sellingStatus.sellingState,
          galleryURL: itemsResponse.searchResult.item.galleryURL
        }

        if(_.has(itemsResponse.searchResult.item, "discountPriceInfo")){
          if(_.has(itemsResponse.searchResult.item.discountPriceInfo, "originalRetailPrice")){
          json.ebay_msrp = itemsResponse.searchResult.item.discountPriceInfo.originalRetailPrice.amount
        }
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

    var n = myRow.search(/\b\d{12}\b/g);
    var new_name = myRow.slice(0, n);
    var regex = new RegExp(',', 'g');
    var beg_of_string = new_name.replace(/,/g,'');

    beg_of_string = beg_of_string + ",";
    var end_of_string = myRow.slice(n)
    myRow = beg_of_string.concat(end_of_string);

    var row = myRow.split(',');
    console.log("ROW", row)

    var data = {};
    for ( var x = 0; x < row.length; x++ )
    {
      data[headers[x]] = row[x];
    }
    jsonData.push(data);
  }
  return jsonData;
};

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
// require('./server/config/mongoose.js');
// require('./server/config/routes.js')(app);

// set up a static file server that points to the "client" directory
app.use(express.static(path.join(__dirname, './client')));

app.listen(8000, function() {
  console.log('cool stuff on: 8000');
});


