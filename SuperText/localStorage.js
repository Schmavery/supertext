// This is called whenever we want to save the current dictionary into the
// local storage area. We pass a some data to save and a callback which
// will be called when the data has been saved. The arguments sent to the
// call back are {data: data}. In the case of setLocalStorage, the data
// will be just a string indicating that we're done saving.
function save(obj, callback) {
  chrome.extension.sendRequest({
    method: "setLocalStorage",
    data: obj
  }, callback);
}

// This is called whenever we want an update on the stored dicitonary
// It will send a request to the background script which will query the
// localstorage database and send a response of the form {data: data}
function load(data, callback) {
  chrome.extension.sendRequest(
    {method: "getLocalStorage", data: data},
    function(response) {
      callback(response ? response.data : null);
  });
}

module.exports = {
  save: save,
  load: load
}
