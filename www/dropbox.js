var url = require("url");
var path = require("path");

var request = require("./request");
var oauth = require("./oauth");

var METADATA_ENDPOINT = "https://api.dropbox.com/1/metadata/sandbox";
var FILE_GET_ENDPOINT = "https://api-content.dropbox.com/1/files/sandbox";
var FILE_PUT_ENDPOINT = "https://api-content.dropbox.com/1/files_put/sandbox";

function token(session, callback, code, refresh) {
  if (typeof code !== "string" || !code) {
    return callback ? callback() : undefined;
  }

  oauth.token(session, oauth.SERVICE.DROPBOX, code, refresh, callback);
}

function metadata(session, callback, access_token, filePath) {
  if (typeof access_token !== "string" || typeof filePath !== "string") {
    return callback ? callback() : undefined;
  }

  while (filePath.charAt(0) === "/") {
    filePath = filePath.slice(1);
  }

  var headers = {
    "Authorization": "Bearer " + access_token
  };

  var u = url.parse(METADATA_ENDPOINT);

  request("GET", u.hostname, path.join(u.pathname, filePath), headers, null,
    null, callback);
}

function file_get(session, callback, access_token, filePath) {
  if (typeof access_token !== "string" || typeof filePath !== "string") {
    return callback ? callback() : undefined;
  }

  while (filePath.charAt(0) === "/") {
    filePath = filePath.slice(1);
  }

  var headers = {
    "Authorization": "Bearer " + access_token
  };

  var u = url.parse(FILE_GET_ENDPOINT);

  request("GET", u.hostname, path.join(u.pathname, filePath), headers, null,
    null, callback);
}

function file_put(session, callback, access_token, filePath, body) {
  if (typeof access_token !== "string" || typeof filePath !== "string" ||
    typeof body !== "string") {
    return callback ? callback() : undefined;
  }

  while (filePath.charAt(0) === "/") {
    filePath = filePath.slice(1);
  }

  var headers = {
    "Authorization": "Bearer " + access_token,
    "Content-Type": "text/plain; charset=utf-8"
  };

  var u = url.parse(FILE_PUT_ENDPOINT);

  request("POST", u.hostname, path.join(u.pathname, filePath), headers, null,
    new Buffer(body,
      "utf8"), callback);
}

module.exports = {
  token: token,
  metadata: metadata,
  file_get: file_get,
  file_put: file_put
};
