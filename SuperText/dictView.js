$(function() {
  // You know have access to dictController.saveDictionary(dict, callback) and
  // dictController.loadDictionary(callback), for this last one, the callback
  // will receive as argument the dictionary
  var dictController = require("./dictionaryController.js");


  var dict;
  chrome.storage.sync.get(request.data, function(data) {
    sendResponse({data: data});
  });


});
