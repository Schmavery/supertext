(function($) {
  // NEW CLEAN CODE FROM HERE

  // Load modules here
  var rwController = require("./replaceWord.js");
  var localStorage = require("./localStorage.js");
  var Bacon = require("./Bacon.js").Bacon;

// Global variables
  var dictionary = [];
  var ALPHAS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-_"
  var KEYS = {
    space: 32,
    biggerThan: 188,
    smallerThan: 190,
    f: 70,
    c: 67,
    escape: 27,
    backspace: 8
  };

  var thes = new Map();
  var port = null;
  var website = "";
  var settings = {
    gmail: {
      replaceWord: rwController.replaceWordGmail,
      suggestionsBoxOffset: {
        left: 830,
        top: 310
      }
    },
    icloud: {
      replaceWord: rwController.replaceWordiCloud,
      suggestionsBoxOffset: {
        left: 0,
        top: 0
      }
    },
    jsfiddle: {
      replaceWord: rwController.replaceWordjsFiddle,
      suggestionsBoxOffset: {
        left: 260,
        top: 170
      }
    },
    wiki: {
      replaceWord: rwController.replaceWordDefault,
      suggestionsBoxOffset: {
        left: 210,
        top: 230
      }
    },
    default: {
      replaceWord: rwController.replaceWordDefault,
      suggestionsBoxOffset: {
        left: 0,
        top: 0
      }
    }
  }


  var suggestionsBox = {
    curIndex: 0,
    suggestions: [],

    draw: function() {
      // TODO: clean this up
      if ($("#tip").length === 0){
        // Make new box
        $(document.body).append("<div id=\"tip\" style=\"background-color:LightGrey;\"></div>");
      }
      var fulltext = "<table>";
      for (var i = 0; i < suggestions.length; i++){

        fulltext += (i === suggestionsIndex) ? "<tr><td><b>" : "<tr><td>";
        fulltext += suggestions[i];
        fulltext += (i === suggestionsIndex) ? "</b></th></td>" : "<td><tr>";
      }
      fulltext += "</table>"
      $("#tip").html(fulltext);
    },

    nextSuggestion: function() {
      this.curIndex = (this.curIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.draw();
    },

    prevSuggestion: function() {
      this.curIndex = (this.curIndex + 1 + this.suggestions.length) % this.suggestions.length;
      this.draw();
    }
  };


  // This function has to be called in order for everything to work.
  // It setsup the event handlers, loads the thesaurus, queries the
  // database for the current dictionary and sets up a message passing port
  // between the background script and this script
  function start(callback) {
    loadStreams();

    // Load thesaurus, rough way (TODO: change that loading)
    var ALLDATA = require("./thesaurus");
    var lines = ALLDATA.split('*');
    for (var i = lines.length - 1; i >= 0; i--) {
      var words = lines[i].split(/[ \s]+/);
      thes.set(words[0], words.slice(1, words.length - 1));
    }

    // Get the website (have different settings depending on the website)
    website = getWebsite();

    port = chrome.extension.connect({name: "onButton"});
    port.onMessage.addListener(function(nessage) {
      if(message.button === "onOff") {
        isOn = message.state;
      }
    })

    localStorage.load("dictionary", function(data) {
      dictionary = data.dictionary;
      console.log("Loaded: " + dictionary);
      if(callback)
        callback();
    });
  }


  // This function will load the streams like commandStream or letterStream
  // those are then given handlers that difer from each other depending on
  // the stream
  function loadStreams() {
    // Using the Bacon Magic :D
    var keyStream = $(document).asEventStream("keydown");


    // Here we're creating the different streams that we'll need

    // LetterStream is literaly a stream of letters, you can do whatever you want with them
    var letterStream = keyStream.filter(function(key){
      return isAlpha(String.fromCharCode(key.which)) && !key.ctrlKey && !key.shiftKey;
    });

    function filterCommands(key) {
      for(var k in KEYS) {
        if(KEYS[k] === key.which) {
          return true;
        }
      }
      return false;
    }

    var commandStream = keyStream.filter(filterCommands);

    var whiteSpaceStream = keyStream.filter(function(key) {
      return !isAlpha(String.fromCharCode(key.which)) && !filterCommands(key);
    });


    // Now we attach event handlers to the different streams that are
    // dependent of the nature of the stream
    // TODO: repair this first draft
    letterStream.onValue(letterPressed);

    commandStream.onValue(commandPressed);

    whiteSpaceStream.onValue(whiteSpacePressed);
  }

  // This function will color all the words that are similar to the one
  // passed as an argument
  function getRelevant(word) {
    // this gets all the previously colored words and removes any tags
    // around them
    $(".foundString").contents().unwrap();

    var body = $(document.body).html();
    synonyms = [];
    if (thes.has(word)){
      synonyms = thes.get(word);
    }
    synonyms.push(word);
    for (var i = 0; i < synonyms.length; i++) {
      var index = body.indexOf(synonyms[i]);
      while (index != -1) {
        var beginning = body.substring(0,index);
        var middle = '<span class="foundString">' + synonyms[i] + "</span>";
        var end = body.substring(index + synonyms[i].length, body.length);
        body = beginning + middle + end;
        index = body.indexOf(synonyms[i], index + middle.length);
        // console.log(index + "  " + synonyms[i]);
      }
    }
    $(document.body).html(body);
  }

  function getWebsite() {
    if(document.URL.indexOf("facebook") !== -1) {
      return "facebook";
    } else if (document.URL.indexOf("mail.google") !== -1) {
      return "gmail";
    } else if (document.URL.indexOf("icloud") !== -1) {
      return "icloud";
    } else if(document.URL.indexOf("jsfiddle") !== -1) {
      return "jsfiddle";
    } else if(document.URL.indexOf("wikipedia") !== -1) {
      return "wiki"
    } else {
      return "default";
    }
  }

  function getSuggestions(str, dict) {
    var f = new Fuse(dict);
    result = f.search(str);
    return result.map(function(val) {
      return dict[val];
    })
  }

  function keyPressed(key) {
    if(isOn) {
      parseKeyPress(key, getCaretPosition(key.target) - 1, getText(key.target, website));
    }
  }




  function isAlpha(ch) {
    return (ALPHAS.indexOf(ch) != -1)
  }

  function clearSuggestions(){
    suggestions = [];
    makeBox();
  }

  // This function will return the word that is currently being written, given the index and the text
  function getCurWord(cursorIndex, text) {
    var beg = 0;
    for (var i = cursorIndex; i >= 0; i--) {
      if (!isAlpha(text.charAt(i))) {
        beg = i + 1;
        break;
      }
    }
    return text.substring(beg, cursorIndex + 1);
  }










  // TO HERE

  // TODO: finish implementing that
  // function didYouMean(word, callback) {
  //   var query = new Parse.Query("SavedDictionary");
  //   query.equalTo("USER_ID", USER_ID);

  //   query.find({
  //     success: function(data) {
  //       var dictionary = data[0].get("didyoumean");
  //       var f = new Fuse(dictionary);
  //       result = f.search(word);
  //       callback(dict[result[0]])
  //     },
  //     error: function(data, error) {

  //     }
  //   });
  // }


  // TODO: understand this AND/OR make this work
  function setEndOfContenteditable(contentEditableElement)
  {
    contentEditableElement = $(".Am.Al.editable.LW-avf")[0];

    var range,selection;
    if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
    {
      range = document.createRange();//Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      selection = window.getSelection();//get the selection object (allows you to change selection)
      selection.removeAllRanges();//remove any selections already made
      selection.addRange(range);//make the range you have just created the visible selection
    }
    else if(document.selection)//IE 8 and lower
    {
      range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
      range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      range.select();//Select the range (make it the visible selection
    }
  }


  function getText(div) {
    if(website === "facebook") {
      console.log("NOPE");
    } else if(website === "gmail") {
      return $(div).html().replace("&nbsp;", " ");
    } else if (website === "icloud"){
      // var txt = "";
      // var t = $("text");
      // var l = $("text").length;
      // for(var i = 0; i < l; i++) {
      //     txt += (t[i]).textContent.replace("&nbsp;", " ").replace(/<.+>|\n+/g, "");
      // }
      // console.log(txt);
      // return txt;
      return "";
    } else {
      if($(div).prop("tagName") === "TEXTAREA") {
        return $(div).val();
      } else {
        return $(div).html();
      }
    }
  }

  // Copy pasted from stackoverflow
  function getCaretPosition(editableDiv) {
    // console.log(editableDiv);

    // If Textare, then we do this:
    if($(editableDiv).prop("tagName") === "TEXTAREA") {
      if (editableDiv.selectionStart) {
        return editableDiv.selectionStart;
      } else if (document.selection) {
        editableDiv.focus();

        var r = document.selection.createRange();
        if (r == null) {
          return 0;
        }

        var re = editableDiv.createTextRange(),
          rc = re.duplicate();
        re.moveToBookmark(r.getBookmark());
        rc.setEndPoint('EndToStart', re);

        return rc.text.length;
      }
    } else if($(editableDiv).prop("tagName") === "DIV") {
      // If div, then we do this:
      var caretPos = 0, containerEl = null, sel, range;
      if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
          range = sel.getRangeAt(0);
          if (range.commonAncestorContainer.parentNode == editableDiv) {
            caretPos = range.endOffset;
          }
        }
      } else if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        if (range.parentElement() == editableDiv) {
          var tempEl = document.createElement("span");
          editableDiv.insertBefore(tempEl, editableDiv.firstChild);
          var tempRange = range.duplicate();
          tempRange.moveToElementText(tempEl);
          tempRange.setEndPoint("EndToEnd", range);
          caretPos = tempRange.text.length;
        }
      }
      return caretPos;
    } else {

    }
  }
  function setCaretPosition(ctrl, pos){
    if(web === "gmail") {
      setEndOfContenteditable(ctrl);
      return;
    }
    if(ctrl.setSelectionRange)
    {
      ctrl.focus();
      ctrl.setSelectionRange(pos,pos);
    }
    else if (ctrl.createTextRange) {
      var range = ctrl.createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  }


  function occurrences(string, subString){
    string+=""; subString+="";
    string = string.toLowerCase();
    // console.log(string);
    if(subString.length<=0) return string.length+1;

    var n=0, pos=0;
    var step= (subString.length);

    while(true){
      pos=string.indexOf(subString,pos);
      if(pos>=0){ n++; pos+=step; } else break;
    }
    return(n);
  }

  function searchInCategory(category, search, callback) {
    localStorage.load("category", function(results) {
      var list = results;
      console.log("SearchInCategory list: " + list);
      if (!list) {
        callback("");
        return;
      }
      // console.log("List: " + list);
      var searchWords = search.split(" ");
      var synonyms = searchWords.slice();
      for (var i = 0; i < searchWords.length; i++) {
        if (thes.has(searchWords[i])) {
           synonyms = synonyms.concat(thes.get(searchWords[i]));
        }
      }
      var maxCount = 0;
      var maxSynIndex = 0;
      for (var i = 0; i < list.length; i++) {
        var string = list[i];
        var important = string.split(":");

        var count = 0;
        var j, inportance = 1;
        for (j = 0; j < synonyms.length; j++) {
          for(var k = 0; k < important.length; k++) {
            importance = (k === 0 ? 4 : 1);
            count += importance * occurrences(important[k], synonyms[j]);
          }
        }
        if (count > maxCount) {
            maxCount = count;
            maxSynIndex = i;
        }
        // console.log("count: " + count);
      }
      if(maxSynIndex === 0)
        callback("");

      callback(list[maxSynIndex]);
    });
  }

  function saveInCategory(category, highlight, callback) {
    localStorage.load("category", function(response) {
        if(response.data) {
          response.data.push(highlight);
        } else {
          response.data = [response.data];
        }
        localStorage.save({category: response.data}, callback);
    });
  }

  function categorizeHighlightedText(category) {

    var html = "";
    if (typeof window.getSelection != "undefined") {
      var sel = window.getSelection();
      if (sel.rangeCount) {
        var container = document.createElement("div");
        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
          container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        html = container.innerHTML;
      }
    } else if (typeof document.selection != "undefined") {
      if (document.selection.type == "Text") {
        html = document.selection.createRange().htmlText;
      }
    }
    html = (html.split(/\s+/)).join(" ");
    // .replace(/<\/?[^>]+(>|$)/g, "");;
    // console.log(html);
    localStorage.saveInCategory(category, html, function() {
      console.log("Successfully saved: " + html);
    });
  }

  // function createTextbox(text, search) {
  //   if(text.length === 0 || search.length === 0)
  //     text = "No matching category or word found.";
  //   var textbox = document.createElement('div');
  //   var inside = document.createElement('div');
  //   var body = text.toLowerCase();
  //   search = search.split(" ");

  //   for (var i = 0; i < search.length; i++) {
  //     var index = body.indexOf(search[i]);
  //     while (index != -1) {
  //       var beginning = body.substring(0,index);
  //       var middle = '<span class="foundString">' + search[i] + "</span>";
  //       var end = body.substring(index + search[i].length, body.length);
  //       body = beginning + middle + end;
  //       index = body.indexOf(search[i], index + middle.length);
  //       // console.log(index + "  " + search[i]);
  //     }
  //   }
  //   $(inside).html(body);
  //   $(inside).addClass("inside");
  //   $(textbox).addClass("searchResult");
  //   textbox.appendChild(inside);
  //   document.body.appendChild(textbox);
  //   $(document).click(function() {
  //     $(textbox).remove();
  //   });
  // }

  start();
})(jQuery);

