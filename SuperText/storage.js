chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if(request.method === "getLocalStorage") {
    chrome.storage.sync.get(request.data, function(data) {
      sendResponse({data: data});
    });
  } else if(request.method === "setLocalStorage") {
    chrome.storage.sync.set(request.data, function() {
      sendResponse({data: request.data});
    });
  } else {
    sendResponse({data: "Error, unknown method"});
  }
});
