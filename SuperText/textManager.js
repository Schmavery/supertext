/**
 * Hello Shopify,
 *
 * first of all, thank you for organizing this hackathon, it was a lot of
 * fun. I very impressed by some of the projects.
 *
 * When we heard that you wanted to look at our code, we realized that it
 * was pretty messy, and that maybe we could explain everything in a big
 * paragraph of comments.
 *
 * We called the library SuperText because it aims to enhance the
 * experience of the user on the web upon interacting with text.
 * What do we mean by "text" you may ask. Well let me explain.
 *
 * Before computers we had everything a computer has, except that it
 * wasn't "dynamic". We had social networks, just by talking to people and
 * going to parties to meet other people, we had mailboxes and post
 * offices, we had a different programming language called "English", which
 * when used approprietly, could get people to work for you and we even had
 * the predecessor of hackernews, the oxford gazette (look it up, it's
 * pretty darn old).
 * Then someone figure out electricity and more precisely eletronics, and
 * had this weird idea of using it do to some logic that he called boolean
 * logic. After that things are little blurry, there was the first
 * computer, the first laptop, the first mobile telephone, the first
 * iPod, iPhone, iMac, iDontWhatImSaying etc...
 * Oh I might have forgotten some minor details like the internet or
 * Virtual Machines, but in globally things were going along pretty well.
 * As of today we can load up webpages using a certain protocol on a
 * certain virtual machine, we can code and know that everyone that has
 * access to the internet will be able to have access to our code in
 * (relatively) the same way, and that's just a beautiful thing.
 *
 * There's just something that bothers me. After all those technological
 * improvements, those futuristic innovations on the web, we're still
 * writing text as if it was on paper, one letter after another, like
 * back in the old days (or when we invented writing). The computer is
 * a wonderful thing that offers a very variety of new things we can do,
 * it's a new media. A computer isn't just paper, it isn't just a screen
 * and a keyboard, it isn't just a big calculator, it's a computer.
 * We need to start thinking about using the computer in more advanced
 * ways than just statically writing text, reading text, displaying
 * images, communicating by chat messages, drawing on a canvas like if it
 * was a sheet of paper and even programming thinking about memory
 * management (but that's an entire other topic that I won't cover here).
 * Our team tried to see the computer as a dynamic system that offers more
 * than just show static data and that's why we created SuperText.
 *
 * We started by implementing autocomplete because it was the first
 * logical step to make the webbrowser smarter, to actually start using
 * the computer as a computer and not as a dynamic sheet of paper. Then
 * we added a thesaurus and intelligent fuzzy-search, so you can lookup
 * words on a webpage and find things that you didn't expect to find. We
 * also added a feature to save paragraphs of text, and then load it
 * by just searching in the database for certain keywords. We didn't
 * present it today because we felt like it wasn't fully working and
 * maybe not the main focus of our project.
 *
 * We intend to extend this project further and have different dictionary
 * depending on the page you are (or you can choose a dictionary if you
 * don't like our choice). So if you're in jsfiddle, you'll have your
 * js/html/css dictionary and when you're on facebook, you'll have your
 * english dictionary. We also intend to add auto-correction to the words
 * that are added to the dictionary, so that when you re-write them, you'll
 * get the corrected version.
 *
 * For the code here is how it goes. We added everything inside it's own
 * namespace (using the anonymous function) and called it Please, so that
 * we could do Please.start() (yes we were tired when we wrote that part).
 * Here is some explanation of the global variables:
 * - {array} dict is an array of all the words you've typed
 * - {array} suggestions is an array of the current suggestions depending
 * on the word you're currently typing
 * - {string} web is a variable to keep the name of the website because we
 * need to know on which website the person is currenty in, in order to
 * load the corresponding settings.
 * - {string} ALLDATA is a gigantic string that contains a mapping from
 * word to word, it's our thesaurus. I know what you're thinking right now
 * and I have one very good excuse: we only had 24h to think, so we did as
 * fast as possible.
 * One big problem we had was to make our autocomplete work for different
 * websites. Gmail, facebook, icloud pages, google docs, reddit all use
 * different ways of getting user input, so we had to load different
 * settings depending on the website (or a default setting, for textboxes
 * and textareas, because they are fully supported). We weren't able to
 * make it work for google docs or icloud because they actually have they
 * own way of pushing text on the screen: each word and line has its own
 * div and when you're writing, you're not writing in anything, it just
 * interprets the keys that you press. Since we can't simulate keypresses
 * without compromising the security of the user, we stopped trying to make
 * it work for icloud and google docs (which, I agree, is unfortunate).
 *
 * Because we didn't have much and because we wanted the demo to work,
 * there is a lot of magic numbers, but it wouldn't take too much to make
 * it a little more user friendly.
 *
 */

var Please = (function($) {
  var dict = [];
  // var SavedDictionary = [];
  var suggestionsIndex = 0;
  var suggestions = [];
  var web = "";

  // Random stuff we needed
  var ALPHAS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-_"
  var SPACE_KEY = 32;
  var UP_KEY = 188;
  var DOWN_KEY = 190;
  var F_KEY = 70;
  var C_KEY = 67;

  // Thanks to chenglou (on github) who made hashmap that is efficient
  // enough to keep a lot of words without dying.
  var thes = new Map();

  // var USER_ID = "123456789";
  var doubleBackspace = 0;
  var offsetLeft = 0, offsetTop = 0;
  var offsetConstant = 30;
  var isOn = true;
  var increment = 0;

  var please = {
    start: function(callback) {
      // Set the event handlers
      $(document).keydown(keyPressed);

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

      loadDictionary(callback);

      web = getWebsite();
      offsetConstant = (web === "gmail" ? 4 : web === "jsfiddle" ? 9 : 4);
    },

    /**
     * Search function (when pressing ctrl + alt + f)
     * It will highlight all the words that it found (and its synonymes)
     * in the html (so yes, you can search for div and you'll break the
     * html)
     * @param  {String} query the sequence of words you're looking for.
     */
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
            // console.log(index + "  " + synonyms[i]);
          }
        }
        $(document.body).html(body);
      }
  };

  /**
   * Save the data into the localstorage (using a backgroung script because
   * this script is injected in the webpage and doesn't have access to the
   * chrome extension storage)
   * @param  {Object}   obj      the object you're willing to saveq
   * @param  {Function} callback its name is pretty straight forward
   */
  function save(obj, callback) {
    chrome.extension.sendRequest({
      method: "setLocalStorage",
      data: obj
    }, callback);
  }

  /**
   * Loads same data based on a string query
   * @param  {String}   data     string query that will be mapped to an object
   * @param  {Function} callback will be called with the newly loaded data as argument
   */
  function load(data, callback) {
    chrome.extension.sendRequest(
      {method: "getLocalStorage", data: data},
      function(response) {
        callback(response ? response.data : null);
    });
  }

  /**
   * Some wrapper around the *load* function
   * @param  {Function} callback
   */
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

  /**
   * Wrapper function around save to save the dictionary
   */
  function saveDictionary(){
    save({"dictionary": dict}, function(d){
    });
  }

  /**
   * This is were we get the suggestions depending on the current dictionary and the give string query. We used a library to have fuzzy search called Fuse (https://github.com/krisk/Fuse)
   * @param  {String} str a string whose existence in the dictionary will
   * be checked
   * @return {Array}      an array of all the results
   */
  function getSuggestions(str) {
    var f = new Fuse(dict);
    result = f.search(str);
    return result.map(function(val) {
      return dict[val];
    })
  }

  /**
   * This empties out the suggestion box which is in charge of displaying
   * all the suggestions
   */
  function clearSuggestions(){
    suggestions = [];
    makeBox();
  }

  /**
   * Event handler for any key presses
   * @param  {Event.key} key an even that a key was pressed
   */
  function keyPressed(key) {
    if(isOn) {
      parseKeyPress(key, getCaretPosition(key.target) - 1, getText(key.target));
    }
  }

  /**
   * This is were everything is done. This function interprets the user
   * input in order to choose what to do depending on what the user typed.
   * This is a pretty messy function that does all kind of stuff like
   * rending the textbox in which the suggestions appear, save the words
   * entered etc...
   * @param  {Event.key} key         the keypress event
   * @param  {integer} cursorIndex position of the cursor in the text
   * @param  {String} text        text written sofar
   */
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
      var thirdPos = (web === "gmail" ? {left: 600 + offsetLeft, top: 270 + offsetTop} : {left: 0, top: 0})
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
      var allHighlighted = $(".foundString");
      if(allHighlighted.length > 0) {
        var pos = $(allHighlighted[increment < allHighlighted.length ? increment++ : increment]).position();
        document.body.scrollTop = pos.top - screen.height / 2;
        // $(allHighlighted[increment]).css({backgroundColor: "red"});
      }
      suggestionsIndex = (suggestionsIndex - 1 + suggestions.length) % suggestions.length;
      makeBox();
    } else if (key.which === DOWN_KEY && key.ctrlKey) { // Down
      var allHighlighted = $(".foundString");
      if(allHighlighted.length > 0) {
        var pos = $(allHighlighted[increment > 0 ? increment-- : increment]).position();
        document.body.scrollTop = pos.top - screen.height / 2;
        // $(allHighlighted[increment]).css({backgroundColor: "red"});
      }

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
          console.log("PUSH " + word);
          saveDictionary();
          // didYouMean(word, function(correct) {
          //     console.log("Did you mean: " + correct);
          // });
        }

      }
      clearSuggestions();
    }
  }

  /**
   * Function that we're going to implement later, it's the google "did
   * you mean" feature.
   * @param  {String}   word     given word to check it it's right
   * @param  {Function} callback
   */
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

  /**
   * This function is used to set the carret position at the end of the
   * newly added word (something that is strangely difficult).
   * @param {DomElement.div} contentEditableElement the div in which the
   * user is writting
   */
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

  /**
   * Very important function, it will read whatever you've written sofar
   * and go back char per char until it finds a space and will consider
   * this list of characters as being the word you're trying to write.
   * @param  {Integer} cursorIndex the cursor position in the text
   * @param  {String} text        the entire text that is in the current
   * div in which the user is writting
   * @return {String}             the current word that the user wants to
   * autocomplete
   */
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

  /**
   * Returns true if the given character is a whitespace (defined as not an
   * alphanumerical)
   * @param  {Character}  ch the character to check
   * @return {Boolean}    whether or not the given char is a whitespace
   */
  function isWhitespace(ch) {
    return !isAlpha(ch);
  }

  /**
   * The exact opposite of the function above, isWhitespace.
   * @param  {Character}  ch given character that needs to be checked
   * @return {Boolean}
   */
  function isAlpha(ch) {
    return (ALPHAS.indexOf(ch) != -1)
  }

  /**
   * This function will repalce *oldWord* in *div* at *pos* with *newWord*
   * This function relies on the website properties: it will replace the
   * word differently depending on which website you're on.
   * @param  {DomElement.div} div     the div in which the user is
   * currently writing
   * @param  {Integer} pos     the carret position in the text
   * @param  {[type]} oldWord the word to replace
   * @param  {[type]} newWord the word to replace the old with
   */
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

  /**
   * This function gets the entire text that you've written. It behaves
   * differently depending on the website.
   * @param  {DomElement.div} div the div in which the user is currently
   * writting
   * @return {String}         the entire text in the div (or textarea...)
   */
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

  /**
   * Simple check to set the global variable *web*
   * @return {String} the current website in which the script is injected
   */
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

  /**
   * This function was taken from stackoverflow and modified a little to
   * meet our requirements. Unfortunatly I can't find exactly were we got
   * it from.
   * @param  {DomElement.div} editableDiv is the div in which the user is
   * writting
   * @return {Integer}        The carret position in the div/textarea etc
   */
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

  /**
   * This function is there to take into account every possible website
   * but is a wrapper for setEndOfCOntenteditable.
   * @param {DomElement} ctrl a dom element in which we want to set the
   * carret position
   * @param {Integer} pos  The position at which we need the carret to be
   */
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

  /**
   * Helper function to draw the suggestion box
   */
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

  // Function not used right now. They were made to save some text under a
  // certain name

  // function occurrences(string, subString){
  //   string+=""; subString+="";
  //   string = string.toLowerCase();
  //   // console.log(string);
  //   if(subString.length<=0) return string.length+1;

  //   var n=0, pos=0;
  //   var step= (subString.length);

  //   while(true){
  //     pos=string.indexOf(subString,pos);
  //     if(pos>=0){ n++; pos+=step; } else break;
  //   }
  //   return(n);
  // }

  // function searchInCategory(category, search, callback) {
  //   var query = new Parse.Query("SavedDictionary");
  //   query.equalTo("USER_ID", USER_ID);
  //   query.find({
  //    success: function(results) {
  //     var list = (category ? results[0].get(category) : results[0].get(category));
  //     // console.log("list: " + list);
  //     if (!list) {
  //       callback("");
  //       return;
  //     }
  //     // console.log("List: " + list);
  //     var searchWords = search.split(" ");
  //     var synonyms = searchWords.slice();
  //     for (var i = 0; i < searchWords.length; i++) {
  //       if (thes.has(searchWords[i])) {
  //         synonyms = synonyms.concat(thes.get(searchWords[i]));
  //       }
  //     }
  //     var maxCount = 0;
  //     var maxSynIndex = 0;
  //     for (var i = 0; i < list.length; i++) {
  //       var string = list[i];
  //       var important = string.split(":");

  //       var count = 0;
  //       var j, inportance = 1;
  //       for (j = 0; j < synonyms.length; j++) {
  //         for(var k = 0; k < important.length; k++) {
  //           importance = (k === 0 ? 4 : 1);
  //           count += importance * occurrences(important[k], synonyms[j]);
  //         }
  //       }
  //       if (count > maxCount) {
  //           maxCount = count;
  //           maxSynIndex = i;
  //       }
  //      // console.log("count: " + count);
  //     }
  //     if(maxSynIndex === 0)
  //      callback("");

  //     callback(list[maxSynIndex]);
  //    },
  //    error: function(error) {
  //     alert("Error: " + error.code + " " + error.message);
  //    }
  //   });
  // }
  // function saveInCategory(category, highlight) {
  //   //var data = Parse.Object.extend();
  //   var query = new Parse.Query("SavedDictionary");
  //   query.equalTo("USER_ID", USER_ID);
  //   query.find({
  //     success: function(results) {
  //       var list = results[0].get(category);
  //       if (list) {
  //         list.push(highlight);
  //       } else {
  //         list = [highlight];
  //       }

  //       results[0].set(category, list);
  //       results[0].save();
  //      },
  //      error: function(error) {
  //       alert("Error: " + error.code + " " + error.message);
  //      }
  //     });
  // }


  // function categorizeHighlightedText(category) {

  //   var html = "";
  //   if (typeof window.getSelection != "undefined") {
  //     var sel = window.getSelection();
  //     if (sel.rangeCount) {
  //       var container = document.createElement("div");
  //       for (var i = 0, len = sel.rangeCount; i < len; ++i) {
  //         container.appendChild(sel.getRangeAt(i).cloneContents());
  //       }
  //       html = container.innerHTML;
  //     }
  //   } else if (typeof document.selection != "undefined") {
  //     if (document.selection.type == "Text") {
  //       html = document.selection.createRange().htmlText;
  //     }
  //   }
  //   html = (html.split(/\s+/)).join(" ");
  //   // .replace(/<\/?[^>]+(>|$)/g, "");;
  //   // console.log(html);
  //   console.log("saved: " + html);
  //   saveInCategory(category, html);

  // }

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

  return please;
})(jQuery);


Please.start();

