$(function() {
  var toggleState;
  if (localStorage.getItem('toggle')=='off'){
    toggleState = false;
  }
  else{
    toggleState = true;
  }

  function toggle(){
    if (toggleState) {
      localStorage.setItem('toggle', 'off');
      $("#togglecover").animate({"left": "0px", "top": "0px"});
    } else {
      localStorage.setItem('toggle', 'on');
      $("#togglecover").animate({"left": "45px", "top": "0px"});
    }
    toggleState = !toggleState;
    chrome.storage.sync.set({"state" : toggleState}, function() {});
  }

  function addMenuItem(string, index, func){
    var item = document.createElement('div');
    var text = document.createElement('div');
    var pointer = document.createElement('div');
    var height;

    $(item).addClass("textContainer").click(func);
    $(text).addClass("menuText");
    $(pointer).addClass("pointer");

    $(text).html(string);

    height = 22*index+5;
    $(item).css({"top": height, "left": "5px"});

    item.appendChild(text);
    item.appendChild(pointer);
    document.body.appendChild(item);
  }

  function startWordSearch(){
    var word = prompt("Search word: ");
    savedDict.set("request", word);
    savedDict.save();
  }

  $(document).ready(function(){
    var container = document.createElement('div');
    var toggleCover = document.createElement('div');
    var toggleOn = document.createElement('div');
    var toggleOff = document.createElement('div');
    var background = document.createElement('div');
    var siding = document.createElement('div');

    $(container).addClass("toggleContainer").click(toggle);

    $(toggleOn).addClass("toggleButton").css({"left": "0px", "top": "0px", "background-image": "none"});
    $(toggleOn).html("<center>ON</center>");
    $(toggleOn).attr("id", "toggleon");

    $(toggleOff).addClass("toggleButton").css({"left": "45px", "top": "0px", "background-image": "none"});
    $(toggleOff).html("<center>OFF</center>");
    $(toggleOff).attr("id", "toggleoff");

    if (toggleState){
      $(toggleCover).addClass("toggleButton").css({"left": "45px", "top": "0px", "background-color": "LightGrey", "box-shadow": "none"});
    }
    else {
      $(toggleCover).addClass("toggleButton").css({"left": "0px", "top": "0px", "background-color": "LightGrey", "box-shadow": "none"});
    }
    $(toggleCover).attr("id", "togglecover");

    $(background).addClass("gradient").css({"left": "0px", "top": "0px"});
    $(siding).addClass("sidePanel").css({"left": "5px", "top": "5px"});

    container.appendChild(toggleOn);
    container.appendChild(toggleOff);
    container.appendChild(toggleCover);
    document.body.appendChild(background);
    document.body.appendChild(siding);
    document.body.appendChild(container);

    addMenuItem("Clear Dictionary", 0, function(){
      chrome.storage.sync.set({"dictionary" : []}, function() {
        alert("Dictionary Cleared.");
      });
    });
    addMenuItem("Help", 1, function(){alert("Shortcuts:\n Ctrl+Shift+F - similar search\n Ctrl+Shift+C - create/set category\n Ctrl+Space - select autocomplete\n Ctrl+< - move up auto selection\n Ctrl+> - move down auto selection")});
    addMenuItem("About", 2, function(){alert("This is SuperText.  Meet the future in interacting textually with your favourite browser, Chrome.\n\nWritten in 24 hours at Y-Hack 2013 by:\n Benjamin, Eric, David and Avery.")});
    addMenuItem("View Dictionary", 3, function(){
      chrome.windows.create({'type' : 'panel', 'url': chrome.extension.getURL('dictView.html')}, function(tab) {
        // Tab opened.
      window.close();
      });});
  });
  //'type' : 'panel'
});
