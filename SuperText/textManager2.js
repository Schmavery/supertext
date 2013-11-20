// Globals: dict, currentWord, suggestionsIndex, suggestions, document

var Please = (function($) {
    var dict = [];
    var SavedDictionary = null;
    var savedDict = null;
    var suggestionsIndex = 0;
    var suggestions = [];
    var web = "";
    var ALPHAS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-_"
    var SPACE_KEY = 32;
    var UP_KEY = 38;
    var DOWN_KEY = 40;
    var thes = new Map();
    var USER_ID = "123456789";

    var please = {
        start: function(callback) {
            // Set the event handlers
            $(document).keydown(keyPressed);
            // Rewrite push so that we save it everytime we push
            dict.push = function (){
                for( var i = 0, l = arguments.length; i < l; i++ )
                {
                    this[this.length] = arguments[i];
                }

                if(savedDict) {
                    savedDict.set('dict', dict);
                    savedDict.save();
                }
                return this.length;
            };


            // Get the thesaurus
            $.get("thesaurus", function(data) {
                var lines = data.split('\n');

                for (var i = lines.length - 1; i >= 0; i--) {
                    var words = lines[i].split(/[ \s]+/);
                    thes.set(words[0], words.slice(1, words.length - 1));
                };

                Parse.initialize("vGoyexsmOZWiBc75B1J7QWiQloHuQ0VlaXjl88b2", "IyL0wnodV3e41IytbRhqxBt2JSFekFHKAds7u0Kt");

                SavedDictionary = Parse.Object.extend("SavedDictionary");
                // savedDict = new SavedDictionary();
                var query = new Parse.Query(SavedDictionary);

                query.equalTo("USER_ID", USER_ID);
                query.find({
                    success: function(saveDictionary) {
                        savedDict = saveDictionary[0];
                        if(savedDict){
                            dict = saveDictionary[0].get("dict");
                            // Rewrite push so that we save it everytime we push
                            dict.push = function (){
                                for( var i = 0, l = arguments.length; i < l; i++ )
                                {
                                    this[this.length] = arguments[i];
                                }

                                if(savedDict) {
                                    savedDict.set('dict', dict);
                                    savedDict.save();
                                }
                                return this.length;
                            };
                            console.log("Dictionary loaded.");
                            if(callback)
                                callback();
                        } else {
                            savedDict = new SavedDictionary();
                            savedDict.set("USER_ID", USER_ID);
                            savedDict.set("state", false);
                            savedDict.set("dict", []);

                            savedDict.save();
                        }
                    },
                    error: function(object, error) {
                        console.log("Error: " + error);
                    }
                })


            });


            web = getWebsite();
        },

        getRelevant: function (query) {
                var body = $(document.body).html();
                synonyms = [];
                if (thes.has(query)){
                    synonyms = thes.get(query);
                }
                synonyms.push(query);
                for (var i = 0; i < synonyms.length; i++) {
                    var index = body.indexOf(synonyms[i]);
                    if (index != -1) {
                        var beginning = body.substring(0,index);
                        var middle = '<span style="background-color:yellow">' + synonyms[i] + "</span>";
                        var end = body.substring(index + synonyms[i].length, body.length);
                        body = beginning + middle + end;
                        $(document.body).html(body);
                        break;
                    }
                }
            }
    };

    function getSuggestions(str) {
        var f = new Fuse(dict);
        result = f.search(str);
        return result.map(function(val) {
            return dict[val];
        })
    }

    function keyPressed(key) {
        parseKeyPress(key, getCaretPosition(key.target) - 1, getText(key.target));
    }

    function parseKeyPress(key, cursorIndex, text) {
        if (!key) return;

        // Check at end of text or followed by whitespace
        if (text.length > cursorIndex + 1 && isAlpha(text.charAt(cursorIndex + 1))) {
            return;
        }
        if(key.ctrlKey && key.which !== SPACE_KEY) {
            return;
        }
        if (key.which === SPACE_KEY && key.ctrlKey) { // Ctrl + Space -- autocomplete
            var curWord = getCurWord(cursorIndex, text);
            suggestions = getSuggestions(curWord);
            replaceWord(key.target, cursorIndex - curWord.length, curWord, suggestions[suggestionsIndex]);
            if(suggestions[suggestionsIndex]) {
                setCaretPosition(key.target, cursorIndex + suggestions[suggestionsIndex].length - curWord.length + 1);
            }

            var pos = $(key.target).getCaretPosition();
        } else if (isAlpha(String.fromCharCode(key.which)) || key.which === 8) {
             // alpha or backspace

            var curWord = getCurWord(cursorIndex, text);
            suggestions = getSuggestions(curWord);
            suggestionsIndex = 0;
        } else if (key.which === UP_KEY) { // Up
            suggestionsIndex = (suggestionsIndex - 1) % suggestions.length;
        } else if (key.which === DOWN_KEY) { // Down
            suggestionsIndex = (suggestionsIndex + 1) % suggestions.length;
        } else if (isWhitespace(String.fromCharCode(key.which))) {
            var word = getCurWord(cursorIndex, text);
            if(word) {
                dict.push(word);
            }
        }
    }

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
        console.log("Replace '" + oldWord + "' and '" + newWord + "'");

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
        } else {
            return $(div).val();
        }
    }

    function getWebsite() {
        if(document.URL.indexOf("facebook") !== -1) {
            return "facebook";
        } else if (document.URL.indexOf("mail.google") !== -1) {
            return "gmail";
        }
    }

    // Copy pasted from stackoverflow
    function getCaretPosition(editableDiv) {
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
        }

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
    }
    function setCaretPosition(ctrl, pos){
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

    return please;
})(jQuery);


Please.start(function() {
    Please.getRelevant("mirage");
});

