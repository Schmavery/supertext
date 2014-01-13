// Globals: dict, currentWord, suggestionsIndex, suggestions, document

var Please = (function($) {
  var dict = [];
  // var SavedDictionary = [];
  var suggestionsIndex = 0;
  var suggestions = [];
  var web = "";
  var ALPHAS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-_"
  var SPACE_KEY = 32;
  var UP_KEY = 188;
  var DOWN_KEY = 190;
  var F_KEY = 70;
  var C_KEY = 67;
  var thes = new Map();
  var USER_ID = "123456789";
  var doubleBackspace = 0;
  var offsetLeft = 0, offsetTop = 0;
  var offsetConstant = 30;
  var isOn = true;

  var please = {
    start: function(callback) {
      // Set the event handlers
      $(document).keydown(keyPressed);
      // loadDictionary();

      $(window).focus(function() {
        loadDictionary();
        load("state", function (data) {
          isOn = data.state;
        });
      });

      var lines = ALLDATA.split('*');

      for (var i = lines.length - 1; i >= 0; i--) {
        var words = lines[i].split(/[ \s]+/);
        thes.set(words[0], words.slice(1, words.length - 1));
      };

      // Parse.initialize("vGoyexsmOZWiBc75B1J7QWiQloHuQ0VlaXjl88b2", "IyL0wnodV3e41IytbRhqxBt2JSFekFHKAds7u0Kt");

      // SavedDictionary = Parse.Object.extend("SavedDictionary");
      // savedDict = new SavedDictionary();
      loadDictionary(callback);

      // Get the thesaurus
      // $.get("thesaurus", function(data) {
      //
      // });


      web = getWebsite();
      offsetConstant = (web === "gmail" ? 4 : web === "jsfiddle" ? 9 : 4);
    },

    getRelevant: function (query) {
        $(".foundString").removeClass(".foundString");
        console.log(thes.get(query));

        var body = $(document.body).html();
        synonyms = [];
        if (thes.has(query)){
          synonyms = thes.get(query);
        }
        synonyms.push(query);
        for (var i = 0; i < synonyms.length; i++) {
          var index = body.indexOf(synonyms[i]);
          while (index != -1) {
            var beginning = body.substring(0,index);
            var middle = '<span class="foundString">' + synonyms[i] + "</span>";
            var end = body.substring(index + synonyms[i].length, body.length);
            body = beginning + middle + end;
            index = body.indexOf(synonyms[i], index + middle.length);
            console.log(index + "  " + synonyms[i]);
          }
        }
        $(document.body).html(body);
      }
  };


  function save(obj, callback) {
    chrome.extension.sendRequest({
      method: "setLocalStorage",
      data: obj
    }, callback);
  }

  function load(data, callback) {
    chrome.extension.sendRequest(
      {method: "getLocalStorage", data: data},
      function(response) {
        callback(response ? response.data : null);
    });
  }

  function loadDictionary (callback) {
    load("dictionary", function (data) {
      if(data.dictionary){
        dict = data.dictionary;
      }
      if(callback){
        callback();
      }
    });
  }

  function saveDictionary(){
    save({"dictionary": dict}, function(d){

    });
  }

  // function loadDictionary(callback) {
  //   console.log("Querying database...");
  //   var query = new Parse.Query(SavedDictionary);

  //   query.equalTo("USER_ID", USER_ID);
  //   query.find({
  //     success: function(saveDictionary) {
  //       savedDict = saveDictionary[0];
  //       if(savedDict){
  //         dict = saveDictionary[0].get("dict");
  //         isOn = saveDictionary[0].get("state");
  //         // console.log(dict);

  //         // Rewrite push so that we save it everytime we push
  //         dict.push = function (){
  //           for( var i = 0, l = arguments.length; i < l; i++ )
  //           {
  //             this[this.length] = arguments[i];
  //           }

  //           console.log("dict " + dict);

  //           if(savedDict) {
  //             savedDict.save({'dict': dict}, {
  //               success: function() {
  //                 savedDict.set('dict', dict);
  //                 console.log("saved");
  //               },
  //               error: function(obj, error) {
  //                 console.log("ERROR");
  //               }
  //             });
  //           }
  //           return this.length;
  //         };
  //         var div = document.createElement('div');
  //         $(div).addClass("searchResult");
  //         $(div).html("<span style='position: absolute; top: 30px; left: 30px;'>SuperText ready.</span>");
  //         $(div).css({opacity: 1, width: 150, height: 100, "font-size": 20, left: "calc(100% - 151px)", top: "0px", "background-image": "-webkit-linear-gradient(right bottom, #FFFFFF 0%, GhostWhite 100%)"});
  //         document.body.appendChild(div);
  //         $(div).animate({opacity: 0}, 1500);

  //         console.log("Dictionary loaded.");
  //         if(callback)
  //           callback();
  //       } else {
  //         savedDict = new SavedDictionary();
  //         savedDict.set("USER_ID", USER_ID);
  //         savedDict.set("dict", []);
  //         savedDict.set("request", "");
  //         savedDict.save();
  //       }
  //     },
  //     error: function(object, error) {
  //       console.log("Error: " + error);
  //     }
  //   })
  // }

  function getSuggestions(str) {
    var f = new Fuse(dict);
    result = f.search(str);
    return result.map(function(val) {
      return dict[val];
    })
  }

  function clearSuggestions(){
    suggestions = [];
    makeBox();
  }

  function keyPressed(key) {
    if(isOn) {
      parseKeyPress(key, getCaretPosition(key.target) - 1, getText(key.target));
    }
  }

  function parseKeyPress(key, cursorIndex, text) {
    if (!key) return;
    // Check at end of text or followed by whitespace
    if (text.length > cursorIndex + 1 && isAlpha(text.charAt(cursorIndex + 1))) {
      clearSuggestions();
      return;
    }
    if(key.which === 27) {
      $(".foundString").removeClass("foundString");
    }
    if(key.ctrlKey || key.shiftKey) {
      if(key.which !== SPACE_KEY && key.which !== UP_KEY && key.which !== DOWN_KEY && key.which !== F_KEY && key.which !== C_KEY) {
        return;
      }
    }
    if (key.which === SPACE_KEY && key.ctrlKey) { // Ctrl + Space -- autocomplete
      var curWord = getCurWord(cursorIndex, text);
      suggestions = getSuggestions(curWord);

      replaceWord(key.target, cursorIndex - curWord.length, curWord, suggestions[suggestionsIndex]);
      if(suggestions[suggestionsIndex]) {
          setCaretPosition(key.target, cursorIndex + suggestions[suggestionsIndex].length - curWord.length + 1);
          // setCursor(key.target, 5);
      }

      if(suggestions[suggestionsIndex]) {
          offsetLeft += 7*(suggestions[suggestionsIndex].length - curWord.length + 1);
      }
      clearSuggestions();

    } else if (isAlpha(String.fromCharCode(key.which)) || key.which === 8) {
       // alpha or backspace
       if(key.which === 8) {
        doubleBackspace++;

        offsetLeft -= offsetConstant;
       } else {
        offsetLeft += offsetConstant;
        doubleBackspace = 0;
       }


      if(key.which === F_KEY && key.ctrlKey && key.altKey) {
        var search = prompt("Enter search word like so category:word");

        if(search === null)
          return;
        var splittedSearch = search.split(":");
        // console.log(splittedSearch);

        if(splittedSearch.length === 1) {
          please.getRelevant(splittedSearch[0]);
          return;
        }
        searchInCategory(splittedSearch[0], splittedSearch[1], function(result) {
          createTextbox(result, splittedSearch[1]);
          // console.log(result);
        });
      }
      if(key.which === C_KEY && key.ctrlKey && key.altKey && key.shiftKey) {
        var cat = prompt("Enter a category to save the highlighted text");
        if(cat && cat.length ===0)
          return;
        categorizeHighlightedText(cat);
      }

      // if(doubleBackspace == 2) {
      //     if(dict.length) {
      //         dict.length--;
      //         savedDict.save({dict: dict});
      //     }
      // }
      var curWord = getCurWord(cursorIndex, text);
      suggestions = getSuggestions(curWord);
      suggestionsIndex = 0;

      var pos = $(key.target).getCaretPosition();
      var textPos = $(key.target).position();
      var thirdPos = (web === "gmail" ? {left: 830 + offsetLeft, top: 310 + offsetTop} : {left: 0, top: 0})
      thirdPos = (web === "jsfiddle" ? {left: 260 + offsetLeft, top: 170 + offsetTop} : thirdPos);

      thirdPos = (web === "wiki" ? {left: 210, top: 230 + offsetTop} : thirdPos);

      $("#tip").css({
          left: pos.left + textPos.left + thirdPos.left,
          top: 5 + pos.top + textPos.top + thirdPos.top
      }).show();

      makeBox();

      if (text.length === 1 && key.which === 8){
          clearSuggestions();
      }
    } else if (key.which === UP_KEY && key.ctrlKey) { // Up
      suggestionsIndex = (suggestionsIndex - 1 + suggestions.length) % suggestions.length;
      makeBox();
    } else if (key.which === DOWN_KEY && key.ctrlKey) { // Down
      suggestionsIndex = (suggestionsIndex + 1) % suggestions.length;

      makeBox();
    } else if (isWhitespace(String.fromCharCode(key.which))) {
      if(key.which === 13) {
          offsetTop += offsetConstant;
          offsetLeft = 0;
      }
      var word = getCurWord(cursorIndex, text);

      if(word) {
        var found = false;
        for (var i = 0; i < dict.length; i++) {
          if (dict[i] === word) {
            found = true;
            break;
          }
        }
        if (!found && word.length > 4){
          dict.push(word);
          saveDictionary();
          // didYouMean(word, function(correct) {
          //     console.log("Did you mean: " + correct);
          // });
        }

      }
      clearSuggestions();
    }
  }
  function didYouMean(word, callback) {
    // var query = new Parse.Query("SavedDictionary");
    // query.equalTo("USER_ID", USER_ID);

    // query.find({
    //   success: function(data) {
    //     var dictionary = data[0].get("didyoumean");
    //     var f = new Fuse(dictionary);
    //     result = f.search(word);
    //     callback(dict[result[0]])
    //   },
    //   error: function(data, error) {

    //   }
    // });
  }

  function setEndOfContenteditable(contentEditableElement)
  {
    contentEditableElement = $(".Am.Al.editable.LW-avf")[0];

    // while(contentEditableElement.lastChild &&
    //       contentEditableElement.lastChild.tagName.toLowerCase() != 'br') {
    //     contentEditableElement = contentEditableElement.lastChild;
    // }

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
  // function setCursor(node,pos){
  //     if(web === "gmail") {
  //         setEndOfContenteditable(node);
  //         return;
  //     }
  // var node = (typeof node == "string" ||
  // node instanceof String) ? document.getElementById(node) : node;
  //     if(!node){
  //         return false;
  //     }else if(node.createTextRange){
  //         var textRange = node.createTextRange();
  //         textRange.collapse(true);
  //         textRange.moveEnd(pos);
  //         textRange.moveStart(pos);
  //         textRange.select();
  //         return true;
  //     }else if(node.setSelectionRange){
  //         node.setSelectionRange(pos,pos);
  //         return true;
  //     }
  //     return false;
  // }
  function getCurWord(cursorIndex, text) {
    var beg = 0;
    for (var i = cursorIndex; i >= 0; i--) {
      if (isWhitespace(text.charAt(i))) {
        beg = i + 1;
        break;
      }
    }
    return text.substring(beg, cursorIndex + 1);
  }

  function isWhitespace(ch) {
    return !isAlpha(ch);
  }

  function isAlpha(ch) {
    return (ALPHAS.indexOf(ch) != -1)
  }
  function replaceWord(div, pos, oldWord, newWord) {
    console.log("Replace '" + oldWord + "' with '" + newWord + "'");

    if(newWord) {
      if(web === "facebook") {
        // var txt = $(div).children('textarea').context.value;
        // while(txt.length && txt[txt.length - 1] !== ' ') {
        //     txt.length--;
        // }
        // $(div).children('textarea').context.value = (txt.join('') + words[0]);
        // console.log($(div).children('textarea').context.value);
        console.log("Not handling facebook yet...");
      } else if(web === "gmail") {
        var txt = $(div).html().trim();
        var first = txt.substring(0, pos + 1);
        var last = txt.substring(pos + oldWord.length + 1, txt.length);
        $(div).html(first + newWord + last);
      } else {
        var txt = $(div).val().trim();
        var first = txt.substring(0, pos + 1);
        var last = txt.substring(pos + oldWord.length + 1, txt.length);
        $(div).val(first + newWord + last);
      }
    }
  }
  function getText(div) {
    if(web === "facebook") {
      console.log("NOPE");
    } else if(web === "gmail") {
      return $(div).html().replace("&nbsp;", " ");
    } else if (web === "icloud"){
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

  function makeBox(){
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
    var query = new Parse.Query("SavedDictionary");
    query.equalTo("USER_ID", USER_ID);
    query.find({
     success: function(results) {
      var list = (category ? results[0].get(category) : results[0].get(category));
      // console.log("list: " + list);
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
     },
     error: function(error) {
      alert("Error: " + error.code + " " + error.message);
     }
    });
  }
  function saveInCategory(category, highlight) {
    //var data = Parse.Object.extend();
    var query = new Parse.Query("SavedDictionary");
    query.equalTo("USER_ID", USER_ID);
    query.find({
      success: function(results) {
        var list = results[0].get(category);
        if (list) {
          list.push(highlight);
        } else {
          list = [highlight];
        }

        results[0].set(category, list);
        results[0].save();
       },
       error: function(error) {
        alert("Error: " + error.code + " " + error.message);
       }
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
    console.log("saved: " + html);
    saveInCategory(category, html);

  }

  function createTextbox(text, search) {
    if(text.length === 0 || search.length === 0)
      text = "No matching category or word found.";
    var textbox = document.createElement('div');
    var inside = document.createElement('div');
    var body = text.toLowerCase();
    search = search.split(" ");

    for (var i = 0; i < search.length; i++) {
      var index = body.indexOf(search[i]);
      while (index != -1) {
        var beginning = body.substring(0,index);
        var middle = '<span class="foundString">' + search[i] + "</span>";
        var end = body.substring(index + search[i].length, body.length);
        body = beginning + middle + end;
        index = body.indexOf(search[i], index + middle.length);
        // console.log(index + "  " + search[i]);
      }
    }
    $(inside).html(body);
    $(inside).addClass("inside");
    $(textbox).addClass("searchResult");
    textbox.appendChild(inside);
    document.body.appendChild(textbox);
    $(document).click(function() {
      $(textbox).remove();
    });
  }

  return please;
})(jQuery);


Please.start();

