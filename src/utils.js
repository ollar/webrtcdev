// Logging utility function.
function trace(arg) {
  var now = (window.performance.now() / 1000).toFixed(3);
  console.log(now + ': ', arg);
}

function uuid() {
  function ko() {
    return Math.floor(Math.random() * 0x10000).toString(16);
  }

  return ko() + ko() + '-' + ko() + '-' + ko() + '-' + ko();
}

function _str(obj) {
  return JSON.stringify(obj);
}

function pageIsVisible() {
  var hidden, visibilityChange;
  if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
  }

  return !document[hidden];
}

module.exports = {
  trace,
  uuid,
  _str,
  pageIsVisible,
}
