var path = require("path");
var fs = require("fs");

var logFile = path.join(__dirname, "log/agitodo.log");

function log(level, msg) {
  var fields = [];
  fields.push("[" + new Date().toISOString() + "]");
  fields.push(level);
  fields.push(typeof msg === "string" ? msg : JSON.stringify(msg));

  // 432 --> 0660 (octal)
  fs.appendFile(logFile, fields.join(" ") + "\n", {
    "mode": 432
  }, function(err) {
    if (err) {
      console.log(err);
    }
  });
}

module.exports = {
  info: function(msg) {
    log("INFO", msg);
  },
  warning: function(msg) {
    log("WARNING", msg);
  },
  error: function(msg) {
    log("ERROR", msg);
  }
};
