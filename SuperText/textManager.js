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
      },

      textPos: function(t){
        return $(t).position();
      }
    },
    icloud: {
      replaceWord: rwController.replaceWordiCloud,
      suggestionsBoxOffset: {
        left: 0,
        top: 0
      },

      textPos: function(t){
        return $(t).position();
      }
    },
    jsfiddle: {
      replaceWord: rwController.replaceWordjsFiddle,
      suggestionsBoxOffset: {
        left: 260,
        top: 170
      },

      textPos: function(t){
        var obj = $(t).position();
        obj.left = -obj.left;
        // obj.top = -obj.top;
        return obj;
      }
    },
    wiki: {
      replaceWord: rwController.replaceWordDefault,
      suggestionsBoxOffset: {
        left: 210,
        top: 230
      },

      textPos: function(t){
        return $(t).position();
      }
    },
    default: {
      replaceWord: rwController.replaceWordDefault,
      suggestionsBoxOffset: {
        left: 0,
        top: 0
      },

      textPos: function(t){
        return $(t).position();
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
      for (var i = 0; i < this.suggestions.length; i++){

        fulltext += (i === this.curIndex) ? "<tr><td><b>" : "<tr><td>";
        fulltext += this.suggestions[i];
        fulltext += (i === this.curIndex) ? "</b></th></td>" : "<td><tr>";
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
    },

    setSuggestions: function(sug) {
      this.suggestions = sug;
      this.draw();
    },

    clearSuggestions: function(){
      this.setSuggestions([]); // YOLO
      this.curIndex = 0;
    }
  };

  // Pevious code is below, this is outdated, but the idea is still correct
  // Just implement the todos and don't mind me, there's no free lunch

  // Copy pasted from stackoverflow
  function getCaretPosition(editableDiv) {
    // console.log(editableDiv);
    var tag = $(editableDiv).prop("tagName");
    // If Textare, then we do this:
    if(tag === "TEXTAREA" || tag === "INPUT") {
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
    } else if(tag === "DIV") {
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
      console.log("getCaretPosition: NOT SUPPORTED FIELD")
      return 0;
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
      var tag = $(div).prop("tagName");
      if(tag === "TEXTAREA" || tag === "INPUT") {
        return $(div).val();
      } else {
        return $(div).html();
      }
    }
  }

  // This function will be called when any alphanumerical key is pressed
  function letterPressed(key) {
    // TODO: Implemente the previous code (below) using the new API


    // Here is what you have access to:
    // - getCurWord and getSuggestions (just look the textManager.js to find those)
    // - suggestionsBox which is an object that has the following properties:
    //    * curIndex: the current index stored as an int
    //    * suggestions: an array of the current suggestions
    //    * draw: a function that you call (No arguments) that will draw the box
    //            but you still need to specify a position by changing the $("#tip")
    //            css property (this wil be changed soon)
    //    * nextSuggestion and prevSuggestion: functions that will move the
    //            current index, and redraw the box at the same position
    // - settings object that contains properties that varies between websites
    // example: if you need to move the suggestionsBox to be next to the div in gmal
    // just do
    // $("#").css({top: whateverY + settings[website].suggestionsBoxOffset.top, left: whateverX + settings[website].suggestionsBoxOffset.left})
    // We'll change the names later.
    // If you have any question, take a look at textManager.js (the part that's been refactored)
    // Then ask me.
    console.log("letterPressed");
    localStorage.load("dictionary", function(data) {
      dictionary = data.dictionary;
      var cursorIndex = getCaretPosition(key.target);
      var text = getText(key.target);
      var curWord = getCurWord(cursorIndex, text);
      var suggestions = getSuggestions(curWord, dictionary);

      // var pos = $(key.target).getCaretPosition();
      var pos = {
        top: 10,
        left: 5
      }
      var textPos = settings[website].textPos(key.target);
      if (text.length === 1 && key.which === 8) {

      };

      // console.log(textPos);
      // console.log(pos);
      // console.log(settings[website].suggestionsBoxOffset);

    // Change the $("#tip") css property
     $("#tip").css({
      left: pos.left + textPos.left + settings[website].suggestionsBoxOffset.left,
      top: 5 + pos.top + textPos.top + settings[website].suggestionsBoxOffset.top
      }).show();

      suggestionsBox.setSuggestions(suggestions);
    });

    // Here is the old code (rest is below below)

    // var curWord = getCurWord(cursorIndex, text);
    // suggestions = getSuggestions(curWord);
    // suggestionsIndex = 0;

    // var pos = $(key.target).getCaretPosition();
    // var textPos = $(key.target).position();
    // var thirdPos = (web === "gmail" ? {left: 830 + offsetLeft, top: 310 + offsetTop} : {left: 0, top: 0})
    // thirdPos = (web === "jsfiddle" ? {left: 260 + offsetLeft, top: 170 + offsetTop} : thirdPos);

    // thirdPos = (web === "wiki" ? {left: 210, top: 230 + offsetTop} : thirdPos);

    // $("#tip").css({
    //     left: pos.left + textPos.left + thirdPos.left,
    //     top: 5 + pos.top + textPos.top + thirdPos.top
    // }).show();

    // makeBox();

    // if (text.length === 1 && key.which === 8){
    //     clearSuggestions();
    // }
  }


  // This function will be called when a command key is pressed
  // Those are defined in the object KEYS that maps names of keys to key numbers
  function commandPressed(key) {
    // TODO: re implement all the commands like before, except nicer plz
    // ctrl + space (autocomplete)
    // ctrl + shift + C (save highlighted)
    // ctrl + shift + F (search)
    // escape (remove the search divs)
    // ctrl + <
    // ctrl + >
    console.log("commandPressed");
    var cursorIndex = getCaretPosition(key.target);
    var text = getText(key.target);
    var curWord = getCurWord(cursorIndex, text);
    var suggestions = suggestionsBox.suggestions;
    var suggestionsIndex = suggestionsBox.curIndex;

    // if (key.keyCode === KEYS.escape) {
    //    $(".foundString").contents().unwrap();
    // }

    // if(key.ctrlKey && key.shiftKey) {
    //   var search = prompt("Search for: ");
    //   if(search === null)
    //     return;

    //   var splittedSearch = search.split(":");

    //   if(splittedSearch.length === 1) {
    //     please.getRelevant(splittedSearch[0]);
    //     return;
    //   }
    //   searchInCategory(splittedSearch[0], splittedSearch[1], function(result) {
    //     // TODO: check createTextBox and make it nice
    //     // createTextbox(result, splittedSearch[1]);
    //   });
    // }

    // if(key.ctrlKey && key.shiftKey) {
    //   var cat = prompt("Save under: ");

    //   if(cat || cat.length === 0)
    //     return;
    //   // TODO: check categorizeHighlightedText and make it nice
    //   // categorizeHighlightedText(cat);
    // }

    if(key.which === KEYS.space && suggestions[suggestionsIndex] !== undefined) {

      settings[website].replaceWord(key.target, cursorIndex - curWord.length, curWord, suggestions[suggestionsIndex]);

      setCaretPosition(key.target, cursorIndex + suggestions[suggestionsIndex].length - curWord.length + 1);
        // setCursor(key.target, 5);
        // offsetLeft += 7*(suggestions[suggestionsIndex].length - curWord.length + 1);
      suggestionsBox.clearSuggestions();
    }


    if (key.which === KEYS.biggerThan) {
      suggestionsBox.nextSuggestion();
    } else if (key.which === KEYS.smallerThan) {
      suggestionsBox.prevSuggestion();
    }
  }


  // This function will be called when a key that is not a command, nor an aphanumerical
  // is pressed.
  function whiteSpacePressed(key) {
    // TODO: save the word that was just entered in the dictionary
    // Again the old code is below
    var cursorIndex = getCaretPosition(key.target);
    var text = getText(key.target);

    console.log("whiteSpacePressed");

    // TODO: save the word that was just typed in dictionary
    var word = getCurWord(cursorIndex, text);
    if(word) {
        var found = false;
        for (var i = 0; i < dictionary.length; i++) {
            if (dictionary[i] === word) {
                found = true;
                break;
            }
        }
        if (!found && word.length > 4){
          dictionary.push(word);
          // didYouMean(word, function(correct) {
          //     console.log("Did you mean: " + correct);
          // });
          localStorage.save({"dictionary" : dictionary}, function(){
          });
        }

    }
    suggestionsBox.clearSuggestions();
  }



  //   if (key.which === SPACE_KEY && key.ctrlKey) { // Ctrl + Space -- autocomplete
  //     // var curWord = getCurWord(cursorIndex, text);
  //     // // suggestions = getSuggestions(curWord);

  //     // replaceWord(key.target, cursorIndex - curWord.length, curWord, suggestions[suggestionsIndex]);
  //     // if(suggestions[suggestionsIndex]) {
  //     //     setCaretPosition(key.target, cursorIndex + suggestions[suggestionsIndex].length - curWord.length + 1);
  //     //     // setCursor(key.target, 5);
  //     // }

  //     // if(suggestions[suggestionsIndex]) {
  //     //     offsetLeft += 7*(suggestions[suggestionsIndex].length - curWord.length + 1);
  //     // }
  //     // clearSuggestions();

  //   } else if (isAlpha(String.fromCharCode(key.which)) || key.which === 8) {
  //     if(key.which === F_KEY && key.ctrlKey && key.altKey) {

  //     }
  //     if(key.which === C_KEY && key.ctrlKey && key.altKey && key.shiftKey) {

  //     }

  //     // if(doubleBackspace == 2) {
  //     //     if(dict.length) {
  //     //         dict.length--;
  //     //         savedDict.save({dict: dict});
  //     //     }
  //     // }
  //     // var curWord = getCurWord(cursorIndex, text);
  //     // suggestions = getSuggestions(curWord);
  //     // suggestionsIndex = 0;

  //     // var pos = $(key.target).getCaretPosition();
  //     // var textPos = $(key.target).position();
  //     // var thirdPos = (web === "gmail" ? {left: 830 + offsetLeft, top: 310 + offsetTop} : {left: 0, top: 0})
  //     // thirdPos = (web === "jsfiddle" ? {left: 260 + offsetLeft, top: 170 + offsetTop} : thirdPos);

  //     // thirdPos = (web === "wiki" ? {left: 210, top: 230 + offsetTop} : thirdPos);

  //     // $("#tip").css({
  //     //     left: pos.left + textPos.left + thirdPos.left,
  //     //     top: 5 + pos.top + textPos.top + thirdPos.top
  //     // }).show();

  //     // makeBox();

  //     // if (text.length === 1 && key.which === 8){
  //     //     clearSuggestions();
  //     // }
  //   } else if (key.which === UP_KEY && key.ctrlKey) { // Up

  //   } else if (key.which === DOWN_KEY && key.ctrlKey) { // Down

  //   } else if (isWhitespace(String.fromCharCode(key.which))) {
  //     // if(key.which === 13) {
  //     //     offsetTop += offsetConstant;
  //     //     offsetLeft = 0;
  //     // }
  //     // var word = getCurWord(cursorIndex, text);
  //     // if(word) {
  //     //     var found = false;
  //     //     for (var i = 0; i < dict.length; i++) {
  //     //         if (dict[i] === word) {
  //     //             found = true;
  //     //             break;
  //     //         }
  //     //     }
  //     //     if (!found && word.length > 4){
  //     //         dict.push(word);
  //     //         didYouMean(word, function(correct) {
  //     //             console.log("Did you mean: " + correct);
  //     //         });
  //     //     }

  //     // }
  //     // clearSuggestions();
  //   }
  // }



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
      return isAlpha(String.fromCharCode(key.which)) && !filterCommands(key) && !key.ctrlKey;
    });

    function filterCommands(key) {
      for(var k in KEYS) {
        if(KEYS[k] === key.which && key.ctrlKey) {
          return true;
        }
      }
      return false;
    }

    var commandStream = keyStream.filter(filterCommands);

    var whiteSpaceStream = keyStream.filter(function(key) {
      var command = !filterCommands(key);
      if(key.which === 32 || key.which === 9 || key.which === 13 || key.which === 10) {
        return command;
      }
      return false;
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

  // function keyPressed(key) {
  //   if(isOn) {
  //     parseKeyPress(key, getCaretPosition(key.target) - 1, getText(key.target, website));
  //   }
  // }




  function isAlpha(ch) {
    return (ALPHAS.indexOf(ch) != -1)
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


  function setCaretPosition(ctrl, pos){
    if(website === "gmail") {
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
