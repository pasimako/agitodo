var https = require("https");
var querystring = require("querystring");

var logger = require("./logger");

function request(method, host, path, headers, params, body, callback) {
  var query = params ? "?" + querystring.stringify(params) : "";

  var options = {
    "host": host,
    "path": path + query,
    "method": method,
    "headers": headers ? headers : {}
  };

  var req = https.request(options, function(res) {
    var status = res.statusCode;
    var body = "";

    res.setEncoding("utf8");

    res.on("data", function(chunk) {
      body += chunk;
    }).on("end", function() {
      if (callback) {
        callback(status, body);
      }
    });
  }).on("error", function(e) {
    logger.error(e.message);

    if (callback) {
      callback();
    }
  });

  if (body) {
    req.write(body);
  }

  req.end();
}

module.exports = request;
