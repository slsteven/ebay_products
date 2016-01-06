# ebay_products
NodeJS, AngularJS, EBAY API

Script to help Ebay Merchandise Client automate process of "top trending module refresh". 

CSV uploaded by user gets converted to JSON. Use Ebay GetItem search to find product info. If not found, use Cheerio to crawl DOM. After scan output JSON file and run comparison. Manipulate data for report and export as CSV.

Created by: Steven Lam
