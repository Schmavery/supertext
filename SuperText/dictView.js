$(function() {
  // You know have access to dictController.saveDictionary(dict, callback) and
  // dictController.loadDictionary(callback), for this last one, the callback
  // will receive as argument the dictionary
  loadDict(["cat", "mouse", "dog", "rat", "giraffe", "elephant", "pikachu", "cat", "mouse", "dog", "rat", "giraffe", "elephant", "pikachu"]);
 // dictController.loadDictionary(loadDict);
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
//      $(chk).addClass("chk");
      $(item).addClass("dictItem");
      $(item).append(dict[i]);
//      item.appendChild(chk);
//      console.log(item);
//      console.log(document.body);
      wrapper.appendChild(item);
    }
    document.body.appendChild(wrapper);
  }

});
