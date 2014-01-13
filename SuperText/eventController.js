
// Pevious code is below, this is outdated, but the idea is still correct
// Just implement the todos and don't mind me, there's no free lunch

var suggestionsIndex;

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

  var cursorIndex = getCaretPosition(key.target);
  var text = getText(key.target);
  var curWord = getCurWord(cursorIndex, text);
  var suggestions = getSuggestions(curWord);
  suggestionsIndex = 0;

  var pos = $(key.target).getCaretPosition();
  var textPos = $(key.target).position();
  if (text.length === 1 && key.which === 8) {

  };


// Change the $("#tip") css property
   $("#tip").css({
       left: pos.left + textPos.left + settings[website].suggestionsBoxOffset.left,
       top: 5 + pos.top + textPos.top + settings[website].suggestionsBoxOffset.top
  }).show();  suggestionsBox.curIndex = suggestionsIndex;

  suggestionsBox.setSuggestions(suggestions);

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
  // ctrl + shift + C (save highlighted)
  // ctrl + shift + F (search)
  // escape (remove the search divs)
  // ctrl + <
  // ctrl + >
    console.log("commandPressde");

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


  // case KEYS.biggerThan:
  //   if(key.ctrlKey) {
  //     suggestionsBox.nextSuggestion();
  //   }
  //   break;
  // case KEYS.smallerThan:
  //   if(key.ctrlKey) {
  //     suggestionsBox.prevSuggestion();
  //    }
  //    break;
}


// This function will be called when a key that is not a command, nor an aphanumerical
// is pressed.
function whiteSpacePressed(key) {
  // TODO: save the word that was just entered in the dictionary
  // Again the old code is below

  console.log("whiteSpacePressed");

  // if(key.ctrlKey) {
  //   // TODO: AUTOCOMPLETE STUFF HERE
  // } else {
  //   // TODO: save the word that was just typed in dictionary
  // }
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

module.exports = {
  letterPressed: letterPressed,
  commandPressed: commandPressed,
  whiteSpacePressed: whiteSpacePressed
};
