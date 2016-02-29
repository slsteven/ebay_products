var cheerio     = require('cheerio');
var util        = require('util');

//utilize the cheerio library on returned html
module.exports = function(json, html, item) {
  console.log("cheerio", item)
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
  //console.log(util.inspect(json));
  return json;
}

