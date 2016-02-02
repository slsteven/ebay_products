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
var _           = require('underscore');
var async       = require('async');
var multer      = require('multer');
var ebay        = require('ebay-api');
var amazon      = require('amazon-product-api');
var json2csv    = require('json2csv');

var Grid        = require('gridfs-stream');
var mongo       = require('mongodb');

var dateFormat  = require('dateFormat');
// set up a static file server that points to the "client" directory
app.use(express.static(path.join(__dirname, './client')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
// require('./server/config/mongoose.js');
// var route_setter = require('./server/config/routes.js');
// route_setter(app);

var storage = multer.diskStorage({
  destination: function(req, file, callback){
    callback(null, './uploads/')
  },
  filename: function(req, file, callback){
    var d = new Date()
    var formated_date = dateFormat(d, "mmddyyyy");
    callback(null, file.fieldname + '-' + formated_date)
  }
})

 var upload = multer({storage: storage});


var mongoose = require('mongoose');
// database name
mongoose.connect('mongodb://localhost/ebay_query');
var conn = mongoose.connection;
Grid.mongo = mongoose.mongo;
var gfs = Grid(conn.db);


var Schema = mongoose.Schema;
var FileSchema = new mongoose.Schema({
  scan_date: {type: Date, default: new Date},
  file_name: String,
  user: String,
  original: [],
  output: []
})

mongoose.model('File', FileSchema);
var File = mongoose.model('File')

var ResSchema = new mongoose.Schema({
  file_name: String,
  scan_date: {type: Date, default: new Date},
  user: String,
  result: []
})

mongoose.model('Res', ResSchema);
var Res = mongoose.model('Res');

//User uploads formated CSV/xlsx file. Make sure column headers are formated with no spaces.
// 'product_name',  'Item_ID',   'Item_Condition', 'ebay_status',  'Vertical',  'Seller_Name', 'Account_Manager', 'MSRP', 'ebay_msrp',  'list_price', 'ebay_list_price', 'recal_perc_off', '%_off', 'Sum_of_GMV',  'Sum_of_Qty',  'Sum_of_Views/SI', 'Sum_of_Seller_rating',  'Sum_of_Buyer_Count',  'Sum_of_Defect_Rate'
app.post('/upload', upload.single('myFile'), function(req, res){
  console.log("upload", req.file)
  var path = req.file.path;
  var source = fs.createReadStream(path);


  //check if files already exist
  var options = {
    filename: req.file.originalname
  }
  gfs.exist(options, function (err, found) {
  if (err) return handleError(err);
  if (found){
    console.log("File exists");
    res.json({success: true, file_name: req.file.originalname});
  } else {
      console.log("file does not exist")
      var writestream = gfs.createWriteStream({
        filename: req.file.originalname
      });

      source.pipe(writestream);
      //find uploaded file
      writestream.on('close', function (file) {
        // do something with `file`
        console.log(file.filename);
        gfs.files.findOne({filename: req.file.originalname}, function(err, file){
        console.log("FILE", file)
        var readstream = gfs.createReadStream({
        filename: file.filename
        })

        //pass readstream to xls to read file
        //call convertTOmethod to change data to JSON
        xls(readstream, function(err, data) {
          if(err) {
            console.log("error converting")
          } else {
            original_json = convertToJSON(data);
            //save JSON to db
            var file = new File ({
              file_name: req.file.originalname,
              user: req.body.email,
              original: original_json
            })
            file.save(function(err, result){
              if(err){
                console.log("document did no save");
              } else {
                console.log("document saved", result);
                res.json({success: true, file_name: req.file.originalname});
              }
            })
            }
          })
        })
      });
    }
  })
})

app.get('/export', function(req, res){
  var result = './client/static/json/result.json';
  fs.readFile(result, 'utf8', function(err, data){
    new_result = JSON.parse(data.slice(13));

    //calculate the % off
    //use ebay_list price and ebay msrp. If values are empty then use original listprice and msrp.
    for(var obj in new_result){
      console.log(new_result[obj])
      if(new_result[obj].ebay_list_price !== "" && (new_result[obj].ebay_msrp !== "" || new_result[obj].msrp !== "")){
        if(new_result[obj].ebay_msrp !== ""){
          var recal_perc_off = ((parseInt(new_result[obj].ebay_msrp) - parseInt(new_result[obj].ebay_list_price))/parseInt(new_result[obj].ebay_msrp));
          new_result[obj].recal_perc_off = recal_perc_off;
        }
        else{
          var recal_perc_off = ((parseInt(new_result[obj].msrp) - parseInt(new_result[obj].ebay_list_price))/parseInt(new_result[obj].msrp));
          new_result[obj].recal_perc_off = recal_perc_off;
        }
      }
    }
    for(x in new_result){
      new_result[x].Sum_of_GMV = parseInt(new_result[x].Sum_of_GMV);
    }

    var sort_by_GMV = _.sortBy(new_result, 'Sum_of_GMV').reverse();

    var fields = ['product_name',  'Item_ID', 'ebay_url', 'Item_Condition', 'Vertical',  'Seller_Name', 'Account_Manager', 'MSRP',  'list_price', '%_off', 'Sum_of_GMV',  'Sum_of_Qty',  'Sum_of_Views/SI', 'Sum_of_Seller_rating',  'Sum_of_Buyer_Count',  'Sum_of_Defect_Rate', 'ebay_status', 'ebay_msrp', 'ebay_list_price', 'recal_perc_off']


    json2csv({data: sort_by_GMV, fields: fields}, function(err, csv){
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

//user selects "get results on frontend"
//compare original.json with output.json
app.get('/get_results/:id', function(req, res){
  console.log("filename", req.params.id)

  get_item(req.params.id, function(data){

    File.findOne({file_name: req.params.id}, function(err, result){
    var output = result.output;
    var original = result.original;
    console.log("LENGTHHHH_______", output.length, original.length)
    var sorted_output = _.sortBy(output, 'ebay_Item_ID');
    sorted_output.shift();
    var sorted_original = _.sortBy(original, 'Item_ID');

    for(var x in sorted_original){
      if(sorted_original[x].Item_ID != undefined){
        sorted_output[x] = _.extend(sorted_output[x], sorted_original[x]);
      }
    }

    Res.findOne({file_name: result.originalname}, function(err, file){
      console.log("SDF", file)
      if(file == null){
        console.log("sorted_output", sorted_output);
        var new_res = new Res({
          user: result.user,
          file_name: result.file_name,
          result: sorted_output
        })
        new_res.save(function(err, result){
          if(err){
            console.log("result did no save");
          } else {
            res.send({result: sorted_output});
          }
        })
      } else {
        res.send({result: sorted_output});
      }
    })
  })

    // fs.writeFile("./client/static/json/result.json", 'var result = ' + JSON.stringify(sorted_output, null, 4), function(err){
    //   console.log("fille succesfully written")
    //   })
    // })

  })
})

app.get('/search_results/:id', function(req, res){
  console.log(req.params)
  Res.findOne({file_name: req.params.id}, function(err, data){
    if(err){
      console.log("cant find")
    } else {
      console.log(data)
      res.send({result: data});
    }
  })
})

//method loops through array of objects in original.json to grab url
//pass url to ebay API to gather info
function get_item(filename, callback2){
  // var original = 'original.json'
  // var original_json = jsonfile.readFileSync(original);
  File.findOne({file_name: filename}, function(err, result){
    if(err){
      console.log("can not find document");
    } else {
      console.log("RESULT", result)
        var original_json = result.original;
        var array_of_urls = [];

        for(var item in original_json){
          url = original_json[item].Item_ID;
          array_of_urls.push(url);
        }

        //asyncjs library to make synchronous call to ebay api
        var arr = [];
        async.eachSeries(array_of_urls,
          function(url, callback){
           var json = {
              ebay_Item_ID: "",
              ebay_product_name: "",
              ebay_list_price: "",
              ebay_msrp: "",
              ebay_status: "",
              galleryURL: "",
              recal_perc_off: ""
            }
            var params = {
              keywords: [url],
              // add additional fields
              outputSelector: ['AspectHistogram'],

              paginationInput: {
                entriesPerPage: 1
              }
            };
            //ebay request
            ebay.xmlRequest({
              serviceName: 'Finding',
              opType: 'findItemsByKeywords',
              appId: 'RideSnap-b66a-448f-9063-46ba6dbe1a3e',
              params: params,
              parser: ebay.parseResponseJson    // (default)
            },
            // gets all the items together in a merged array
            function itemsCallback(error, itemsResponse) {
              console.log("FAILING", itemsResponse.searchResult)
              //push empty object if failure
              if(itemsResponse.ack == "Failure"){
                json.ebay_Item_ID = url;
                arr.push(json);
                callback();
              }
              //if ebay returns count of 0, then manually grab product listing by crawling website with cheerio
              else if(itemsResponse.searchResult.$.count == 0){
                request("http://ebay.com/itm/"+url, function(error, response, html){
                //check for errors
                  if(!error){
                    //utilize the cheerio library on returned html
                    var $ = cheerio.load(html);
                    var id = url.slice(20);
                    //get product name using unique class as starting point
                    $('.it-ttl').filter(function(){
                    var data = $(this);
                    title = data.text().slice(16);
                    json.ebay_product_name = title;
                    })
                    //grab status and item id with unique class
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
              else{ //if we are able to find product with ebay call and count is 0 then store info
                // console.log("a;lsdkjf;alksdjf", itemsResponse.searchResult.item.discountPriceInfo)
              json = {
                ebay_Item_ID: itemsResponse.searchResult.item.itemId,
                ebay_product_name: itemsResponse.searchResult.item.title,
                ebay_list_price: itemsResponse.searchResult.item.sellingStatus.currentPrice.amount,
                ebay_status: itemsResponse.searchResult.item.sellingStatus.sellingState,
                galleryURL: itemsResponse.searchResult.item.galleryURL
              }
              //this is to check for msrp.
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
            File.findOne({file_name: filename}, function(err, data){
              data.output = arr;
              data.save(function(err, res){
              if(err){
                console.log("output did not save");
              } else {
                console.log("output saved");
                callback2("complete")
                }
             })
          });
          // JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make JSON easier to read
          // Parameter 3 :  callback function - a callback function to let us know the status of our
          // fs.writeFile('output.json', JSON.stringify(arr, null, 4), 'utf-8',
          // function(err){
          //   if(err){
          //     console.log("fille error when writing")
          //   }
          //  callback2("complete")
          // })
        })
        console.log("orig leng", original_json.length)
    }
  });
}


//method creats an array of objects.
function convertToJSON(array) {
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



app.listen(8000, function() {
  console.log('cool stuff on: 8000');
});











//START: Amazon API still testing ======================================================
// var params = {
//         keywords: ['371039735916'],
//         // add additional fields
//         outputSelector: ['AspectHistogram'],

//         paginationInput: {
//           entriesPerPage: 1
//         }
//       };
//       ebay.xmlRequest({
//         serviceName: 'Finding',
//         opType: 'findItemsByKeywords',
//         appId: 'RideSnap-b66a-448f-9063-46ba6dbe1a3e',
//         params: params,
//         parser: ebay.parseResponseJson    // (default)
//       },
//       // gets all the items together in a merged array
//       function itemsCallback(error, itemsResponse) {
//         console.log("FAIL", itemsResponse.searchResult.item)
//         });

var client = amazon.createClient({
  awsId: "",
  awsSecret: "",
  awsTag: ""
});

 // console.log("amazon client", client)

// client.itemSearch({
//   keywords: 'Zmodo 8 CH HDMI DVR 4 CCTV Outdoor Home Surveillance Security Camera',
//   responseGroup: 'ItemAttributes,Offers,Images'
// }).then(function(results){
//   console.log("results", results);
// }).catch(function(err){
//   console.log("errror", err);
// });
//END: for testing ======================================================
