var cheerio     = require('cheerio');
var request     = require('request');
var xls         = require('excel');
var jsonfile    = require('jsonfile');
var _           = require('underscore');
var async       = require('async');
var ebay        = require('ebay-api');
var mongoose = require('mongoose')


exports.scan = function (items, array_of_urls, File) {
var count = 0;
var collection_of_json = [];

 async.each(items,
        function(item, callback) {

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
            console.log("Item:", itemsResponse.ack)
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
                request("http://ebay.com/itm/"+item, function(error, response, html) {
                  //check for errors
                  if (!error) {
                    //utilize the cheerio library on returned html
                    var $ = cheerio.load(html);
                    var id = item.slice(20);
                    //get product name using unique class as starting point
                    $('.it-ttl').filter(function() {
                      var data = $(this);
                      title = data.text().slice(16);
                      json.ebay_product_name = title;
                    })
                    //grab status and item id with unique class
                    $('.msgTextAlign').filter(function() {
                      var data = $(this);
                      status = data.text();
                      json.ebay_status = status;
                      json.ebay_Item_ID = url;
                    });
                    collection_of_json.push(json);
                    console.log("Cheerio", count, array_of_urls.length);
                    count++;
                    callback();
                  };
                });
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
            console.log("DONE");
            File.findOne({file_name: filename}, function(err, data) {
              data.output = collection_of_json;
              data.save(function(err, res) {
                if (err) {
                  console.log("output did not save");
                } else {
                  save_result(filename);
                  console.log("output saved");
                }
              })
            });
          }
        }
      );
}

