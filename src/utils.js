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

module.exports = {
  trace: trace,
  uuid: uuid,
}
