// Global variables
var rwController = require("./replaceWord.js");

var global = {
  dictionary: [],
  ALPHAS: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-_",
  KEYS: {
    space: 32,
    biggerThan: 188,
    smallerThan: 190,
    f: 70,
    c: 67,
    escape: 27,
    backspace: 8
  },

  thes: new Map(),
  port: null,
  website: "",
  settings: {
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
  },


  suggestionsBox: {
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
    },

    setSuggestions: function(sug) {
      this.suggestions = sug;
      this.draw();
    }
  }
}

var APP = require("./textManager.js");
APP.start.call(global);
