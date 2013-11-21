$(function() {
  var dict;
  chrome.storage.sync.get(request.data, function(data) {
    sendResponse({data: data});
  });
  

});
