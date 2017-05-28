var request = require("./request");
var oauth = require("./oauth");

var SEND_ENDPOINT =
  "https://www.googleapis.com/upload/gmail/v1/users/me/messages/send";
var MAX_LINE_B64 = 76;

function token(session, callback, code, refresh) {
  if (typeof code !== "string" || !code) {
    return callback ? callback() : undefined;
  }

  oauth.token(session, oauth.SERVICE.GMAIL, code, refresh, callback);
}

function validateEmail(email) {
  if (typeof email !== "string" || email.length > 100) {
    return;
  }

  // Printable ascii (excluding space)
  if (!new RegExp("^[!-~]{6,100}$").test(email)) {
    return;
  }

  return new RegExp(
      "^[^@=<>;+]+@[a-zA-Z0-9-]{1,64}(\\.[a-zA-Z0-9-]{1,64})*\\.[a-zA-Z]{2,}$")
    .test(email);
}

function send(session, callback, access_token, to, subject, content) {
  if (typeof access_token !== "string" || typeof to !== "string" || typeof subject !==
    "string" ||
    typeof content !== "string" || !validateEmail(to)) {
    return callback ? callback() : undefined;
  }

  var lines = [];

  lines.push("To: <" + to + ">");
  lines.push("Subject: =?UTF-8?B?" + new Buffer(subject).toString("base64") +
    "?=");
  lines.push("Content-Type: text/html; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");

  var content_b64 = "";
  var b = new Buffer(content).toString("base64");

  for (var i = 0, c = 0; i < b.length; i++, c++) {
    if (c >= MAX_LINE_B64) {
      content_b64 += "\r\n";
      c = 0;
    }

    content_b64 += b[i];
  }

  lines.push(content_b64);

  var headers = {
    "Authorization": "Bearer " + access_token,
    "Content-Type": "message/rfc822"
  };

  var u = url.parse(SEND_ENDPOINT);

  request("POST", u.hostname, u.pathname + "?uploadType=media", headers, null,
    new Buffer(lines
      .join("\r\n"), "utf8"), callback);
}

module.exports = {
  token: token,
  send: send
};
