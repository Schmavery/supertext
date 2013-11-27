// TODO: check if those functions actually work

function replaceWordGmail(div, pos, oldWord, newWord) {
  var txt = $(div).html().trim();
  var first = txt.substring(0, pos + 1);
  var last = txt.substring(pos + oldWord.length + 1, txt.length);
  $(div).html(first + newWord + last);
}

function replaceWordDefault(div, pos, oldWord, newWord) {
  var txt = $(div).val().trim();
  var first = txt.substring(0, pos + 1);
  var last = txt.substring(pos + oldWord.length + 1, txt.length);
  $(div).val(first + newWord + last);
}

function replaceWordFacebook(div, pos, oldWord, newWord) {
  // var txt = $(div).children('textarea').context.value;
  // while(txt.length && txt[txt.length - 1] !== ' ') {
  //     txt.length--;
  // }
  // $(div).children('textarea').context.value = (txt.join('') + words[0]);
  // console.log($(div).children('textarea').context.value);
  console.log("Not handling facebook yet...");
}

// TODO: implement this
function replaceWordiCloud(div, pos, oldWord, newWord) {
  console.log("Not implemented yet...");
}

// TODO: implement this too
function replaceWordjsFiddle(div, pos, oldWord, newWord) {
  console.log("Not implemented yet...");
}

module.exports = {
  replaceWordGmail: replaceWordGmail,
  replaceWordjsFiddle: replaceWordjsFiddle,
  replaceWordFacebook: replaceWordFacebook,
  replaceWordiCloud: replaceWordiCloud,
  replaceWordDefault: replaceWordDefault
};
