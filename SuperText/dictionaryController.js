// This is called whenever we want to save the current dictionary into the
// local storage area. We pass a some data to save and a callback which
// will be called when the data has been saved. The arguments sent to the
// call back are {data: data}. In the case of setLocalStorage, the data
// will be just a string indicating that we're done saving.
function saveDictionary(dict, callback) {
  chrome.extension.sendRequest(
    {method: "setLocalStorage", data: dict},
    callback);
}

// This is called whenever we want an update on the stored dicitonary
// It will send a request to the background script which will query the
// localstorage database and send a response of the form {data: data}
function loadDictionary(callback) {
  chrome.extension.sendRequest(
    {method: "getLocalStorage", data: "dictionary"},
    function(response) {
      dictionary = response.data;
      if(callback)
        callback();
  });
}

exports.saveDictionary = saveDictionary;
exports.loadDictionary = loadDictionary;
