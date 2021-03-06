var fs            = require("fs");
var xls           = require('excel');
var mongoose      = require('mongoose')
var request     = require('request');
var xls         = require('excel');
var json2csv    = require('json2csv');
var jsonfile    = require('jsonfile');
var _           = require('underscore');
var async       = require('async');
var ebay        = require('ebay-api');
var File          = mongoose.model('File')
var Res           = mongoose.model('Res');
var save_result   = require('../../modules/save_result')
var convertToJSON = require('../../modules/convertToJSON');
var scrape_dom    = require('../../modules/scrape_dom')
var debug         = require('debug')('HTTP');

  //User uploads formated CSV/xlsx file. Make sure column headers are formated with no spaces.
  // 'product_name',  'Item_ID',   'Item_Condition', 'ebay_status',  'Vertical',  'Seller_Name', 'Account_Manager', 'MSRP', 'ebay_msrp',  'list_price', 'ebay_list_price', 'recal_perc_off', '%_off', 'Sum_of_GMV',  'Sum_of_Qty',  'Sum_of_Views/SI', 'Sum_of_Seller_rating',  'Sum_of_Buyer_Count',  'Sum_of_Defect_Rate'
module.exports = function(app, upload, gfs, log) {
  app.post('/upload', upload.single('myFile'), function(req, res) {

    log.info({ req: req }, 'start req for upload');

    debug('uploaded file: ', req.file)
    var path = req.file.path;
    var source = fs.createReadStream(path);
    var options = {
      filename: req.file.originalname
    }

    gfs.exist(options, function (err, found) {
      if (err) {
        return handleError(err);
      }
      if (found) {
        log.info({ res: res }, "done response. File exists.")

        console.log("File already exists");
        res.json({success: true, file_name: req.file.originalname});
      } else {

        var writestream = gfs.createWriteStream({
          filename: req.file.originalname
        });

        source.pipe(writestream);

        //close is emitted after file is full written
        writestream.on('close', function (file) {

          var readstream = gfs.createReadStream(options);

          //pass readstream to xls and call convertToJSON method
          xls(readstream, function(err, data) {
            if (err) {
              console.log("error converting readstream");
            } else {
              original_json = convertToJSON(data);
              //save JSON to mongoDB
              var file = new File ({
                file_name: req.file.originalname,
                user: req.body.email,
                original: original_json
              })

              file.save(function(err, result) {
                if(err) {
                  console.log("document did no save");
                } else {

                  log.info({ req: req }, 'start req for upload');

                  console.log("document saved");
                  res.json({success: true, file_name: req.file.originalname});
                }
              })
            }
          })
        })
      }
    })
  });

  app.get('/search_results/:id', function(req, res) {

    debug(req.params);

    Res.findOne({file_name: req.params.id}, function(err, data) {
      if (err) {
        console.log("cant find")
      } else {
        res.send({result: data});
      }
    })
  });

  app.get('/index', function(req, res) {
    Res.find({}, {"result": 0}, function(err, result) {
      res.send({ index: result });
    })
  });

  app.get('/get_results/:id', function(req, response) {
    console.log("filename", req.params.id)
    var filename = req.params.id;

    File.findOne({file_name: filename}, function(err, result) {
      if (err) {
        console.log("can not find document");
      } else {
        var original_json = result.original;
        var array_of_urls = [];

        for (var item in original_json) {
          url = original_json[item].Item_ID;
          array_of_urls.push(url);
        }

        console.log(array_of_urls)
        var items = array_of_urls;
        var count = 0;
        var collection_of_json = [];
        var num_calls_with_cheerio = 0;

        //query_ebay.scan(items, array_of_urls, File);

        async.each(items,
          function(item, callback) {

            debug('Scanning: ', item)

            var json = {
              ebay_Item_ID: "",
              ebay_product_name: "",
              ebay_list_price: "",
              ebay_msrp: "",
              ebay_status: "",
              galleryURL: "",
              recal_perc_off: ""
            };

            var params = {
              keywords: [item],
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
              debug('itemresponse: ', itemsResponse.ack)
                //push empty object if failure
                if(itemsResponse.ack === "Failure"){
                  json.ebay_Item_ID = url;
                  collection_of_json.push(json);
                  console.log("Fail", count, array_of_urls.length);
                  count++;
                  callback();
                }
                //if ebay returns count of 0, then manually grab product listing by crawling website with cheerio
                else if (itemsResponse.searchResult.$.count == 0) {
                  num_calls_with_cheerio++;
                  console.log('num_calls_cheerio: ', num_calls_with_cheerio)

                  //async.queue to prevent making too many async requests at a time
                  var q = async.queue(function(task, callback) {
                  console.log("task", task)

                    request("http://ebay.com/itm/"+item, function(error, response, html) {
                      //check for errors
                      if (!error) {

                        json = scrape_dom(json, html, item);

                        collection_of_json.push(json);

                        console.log("Cheerio", count, array_of_urls.length);
                        count++;
                        callback();
                      };
                    })
                  }, 2);

                  q.drain = callback;
                  q.push(item);

                  if (num_calls_with_cheerio % 3 === 0) {
                    q.pause();
                    console.log("we are pausedddd!", item, count)
                    setTimeout(function(){
                      console.log("resumed!")
                      q.resume();
                    }, 2000);
                  }

                  if (num_calls_with_cheerio % 5 === 0) {
                    q.pause();
                    console.log("we are pausedddd!", item, count)
                    setTimeout(function(){
                      console.log("resumed!")
                      q.resume();
                    }, 3000)
                  }

                } else { //if we are able to find product with ebay call and count is 0 then store info
                   console.log("EBAY API:", itemsResponse)
                json = {
                  ebay_Item_ID: itemsResponse.searchResult.item.itemId,
                  ebay_product_name: itemsResponse.searchResult.item.title,
                  ebay_list_price: itemsResponse.searchResult.item.sellingStatus.currentPrice.amount,
                  ebay_status: itemsResponse.searchResult.item.sellingStatus.sellingState,
                  galleryURL: itemsResponse.searchResult.item.galleryURL
                }
                //check if response includes msrp.
                if (_.has(itemsResponse.searchResult.item, "discountPriceInfo")) {
                  if (_.has(itemsResponse.searchResult.item.discountPriceInfo, "originalRetailPrice")) {
                  json.ebay_msrp = itemsResponse.searchResult.item.discountPriceInfo.originalRetailPrice.amount
                  }
                }
                collection_of_json.push(json)
                count++;
                console.log(count, array_of_urls.length);
                callback();
                }
            })
          },
          function () {
            console.log(count, array_of_urls.length);
            if (count === array_of_urls.length) {
              File.findOne({file_name: filename}, function(err, data) {

                data.output = collection_of_json;

                data.save(function(error, result) {
                  if (error) {
                    console.log("output did not save");
                  } else {
                    save_result(response, filename, function(sorted_output) {
                    response.send({ result: sorted_output })
                    });
                  }
                })
              });
            }
          }
        );
      }
    });
  })

  app.get('/export/:id', function(req, res){
    Res.findOne({file_name: req.params.id}, function(err, data) {
      if (err) {
        console.log("error finding results for export");
      } else {
        console.log("data for exporting", data.result);
        var new_result = data.result;

        //calculate the % off
        //use ebay_list price and ebay msrp. If values are empty then use original listprice and msrp.
        // for(var obj in new_result){
        //   console.log(new_result[obj])
        //   if(new_result[obj].ebay_list_price !== "" && (new_result[obj].ebay_msrp !== "" || new_result[obj].msrp !== "")){
        //     if(new_result[obj].ebay_msrp !== ""){
        //       var recal_perc_off = ((parseInt(new_result[obj].ebay_msrp) - parseInt(new_result[obj].ebay_list_price))/parseInt(new_result[obj].ebay_msrp));
        //       new_result[obj].recal_perc_off = recal_perc_off;
        //     }
        //     else{
        //       var recal_perc_off = ((parseInt(new_result[obj].msrp) - parseInt(new_result[obj].ebay_list_price))/parseInt(new_result[obj].msrp));
        //       new_result[obj].recal_perc_off = recal_perc_off;
        //     }
        //   }
        // }
      for (x in new_result) {
        new_result[x].Sum_of_GMV = parseInt(new_result[x].Sum_of_GMV);
      }

      var sort_by_GMV = _.sortBy(new_result, 'Sum_of_GMV').reverse();

      var fields = ['product_name',  'Item_ID', 'ebay_url', 'Item_Condition', 'Vertical',  'Seller_Name', 'Account_Manager', 'MSRP',  'list_price', '%_off', 'Sum_of_GMV',  'Sum_of_Qty',  'Sum_of_Views/SI', 'Sum_of_Seller_rating',  'Sum_of_Buyer_Count',  'Sum_of_Defect_Rate', 'ebay_status', 'ebay_msrp', 'ebay_list_price', 'recal_perc_off']


      json2csv({data: sort_by_GMV, fields: fields}, function(err, csv) {
        if (!err) {
          fs.writeFile('file.csv', csv, function(err) {
            if (err) throw err;
            res.send("check file.csv")
            console.log('file saved');
          });
        }
      })
    // })
      }
    })
  })
};
