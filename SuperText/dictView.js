$(function() {
  // You know have access to dictController.saveDictionary(dict, callback) and
  // dictController.loadDictionary(callback), for this last one, the callback
  // will receive as argument the dictionary

  // This is a local function, no need for require because we're on the extension
  // side which can have access to the chrome storage area
  function loadDictionary(sendResponse) {
    chrome.storage.sync.get(request.data, function(data) {
      sendResponse({data: data});
    });
  }

  loadDict(["cat", "mouse", "dog", "rat", "giraffe", "elephant", "pikachu", "cat", "mouse", "dog", "rat", "giraffe", "elephant", "pikachu"]);
  // loadDictionary(loadDict);
  function loadDict(dict){
    var wrapper = document.createElement("div");
    $(wrapper).addClass("wrapper");

    for (var i = 0; i < dict.length; i++){
      var item = document.createElement("div");


      $(item).addClass("dictItem").append(dict[i]);
      
      var btn = $("<input>", {
        type:"button",
        value:"DELETE"
      }).addClass("deletebtn").appendTo(item);
      
      btn.on("click", null, btn, editDict);

      wrapper.appendChild(item);
    }
    document.body.appendChild(wrapper);
  }

  function editDict(btn){
    console.log("Editing dict");
//    var dictItems = document.getElementsByClassName("dictItem");
    console.log(btn);
    console.log($(btn.target).parent());
    $(btn.target).parent().remove();
  }

});

