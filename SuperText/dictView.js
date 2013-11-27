$(function() {
  // You know have access to dictController.saveDictionary(dict, callback) and
  // dictController.loadDictionary(callback), for this last one, the callback
  // will receive as argument the dictionary

  loadDict(["cat", "mouse", "dog", "rat", "giraffe", "elephant", "pikachu", "cat", "mouse", "dog", "rat", "giraffe", "elephant", "pikachu"]);
 // loadDictionary(loadDict);
  function loadDict(dict){
    var wrapper = document.createElement("div");
    var buttonBar = document.createElement("div");
    $(wrapper).addClass("wrapper");
    $(buttonBar).addClass("buttonbar");

    $(buttonBar).append("HEEEELLLOO OUTT THEEERREEEE....");
    wrapper.appendChild(buttonBar);



    for (var i = 0; i < dict.length; i++){
      var item = document.createElement("div");
      var chk = $("<input>", {
        type:"checkbox"
      }).addClass("chk").appendTo(item);
      $(item).addClass("dictItem").append(dict[i]);
      wrapper.appendChild(item);
    }
    document.body.appendChild(wrapper);
  }

});

// This is a local function, no need for require because we're on the extension
// side which can have access to the chrome storage area
function loadDictionary(sendResponse) {
  chrome.storage.sync.get(request.data, function(data) {
    sendResponse({data: data});
  });
}
