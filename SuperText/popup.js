// Run our kitten generation script as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () {
  var s = document.createElement('script');
  s.src = chrome.extension.getURL("script.js");
  s.onload = function() {
    this.parentNode.removeChild(this);
  };
  (document.head || document.documentElement).appendChild(s);
});
console.log("sdfljhdsflisdhf");
