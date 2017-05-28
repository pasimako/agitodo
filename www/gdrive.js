var url = require("url");
var path = require("path");

var request = require("./request");
var oauth = require("./oauth");

var METADATA_ENDPOINT = "https://www.googleapis.com/drive/v2/files";
var LIST_ENDPOINT = "https://www.googleapis.com/drive/v2/files";
var DELETE_FILE_ENDPOINT = "https://www.googleapis.com/drive/v2/files";
var NEW_FILE_ENDPOINT = "https://www.googleapis.com/upload/drive/v2/files";
var UPDATE_FILE_ENDPOINT = "https://www.googleapis.com/upload/drive/v2/files";

function token(session, callback, code, refresh) {
  if (typeof code !== "string" || !code) {
    return callback ? callback() : undefined;
  }

  oauth.token(session, oauth.SERVICE.GDRIVE, code, refresh, callback);
}

function metadata(session, callback, access_token, fileId) {
  if (typeof access_token !== "string" || typeof fileId !== "string") {
    return callback ? callback() : undefined;
  }

  while (fileId.charAt(0) === "/") {
    fileId = fileId.slice(1);
  }

  var headers = {
    "Authorization": "Bearer " + access_token
  };

  var u = url.parse(METADATA_ENDPOINT);

  request("GET", u.hostname, path.join(u.pathname, fileId), headers, null, null,
    callback);
}

function list(session, callback, access_token, filename) {
  if (typeof access_token !== "string" || typeof filename !== "string") {
    return callback ? callback() : undefined;
  }

  var headers = {
    "Authorization": "Bearer " + access_token
  };

  var params = {
    "q": "'appdata' in parents AND trashed=false" +
      ((filename === "*") ? "" : " AND title='" + filename + "'")
  };

  var u = url.parse(LIST_ENDPOINT);

  request("GET", u.hostname, u.pathname, headers, params, null, callback);
}

function deleteFile(session, callback, access_token, fileId) {
  if (typeof access_token !== "string" || typeof fileId !== "string") {
    return callback ? callback() : undefined;
  }

  while (fileId.charAt(0) === "/") {
    fileId = fileId.slice(1);
  }

  var headers = {
    "Authorization": "Bearer " + access_token
  };

  var u = url.parse(DELETE_FILE_ENDPOINT);

  request("DELETE", u.hostname, path.join(u.pathname, fileId), headers, null,
    null, callback);
}

function newFile(session, callback, access_token, filename, content) {
  if (typeof access_token !== "string" || typeof filename !== "string" ||
    typeof content !== "string") {
    return callback ? callback() : undefined;
  }

  var body = "";
  body += "--part";
  body += "\n";
  body += "Content-Type: application/json; charset=UTF-8";
  body += "\n\n";
  body += JSON.stringify({
    "title": filename,
    "parents": [{
      "id": "appdata"
    }]
  });
  body += "\n\n";
  body += "--part";
  body += "\n";
  body += "Content-Type: text/plain; charset=UTF-8";
  body += "\n\n";
  body += content;
  body += "\n\n";
  body += "--part--";

  var headers = {
    "Authorization": "Bearer " + access_token,
    "Content-Type": "multipart/related; boundary=\"part\""
  };

  var u = url.parse(NEW_FILE_ENDPOINT);

  request("POST", u.hostname, u.pathname + "?uploadType=multipart", headers,
    null, new Buffer(body,
      "utf8"), callback);
}

function updateFile(session, callback, access_token, fileId, content) {
  if (typeof access_token !== "string" || typeof fileId !== "string" || typeof content !==
    "string") {
    return callback ? callback() : undefined;
  }

  while (fileId.charAt(0) === "/") {
    fileId = fileId.slice(1);
  }

  var headers = {
    "Authorization": "Bearer " + access_token,
    "Content-Type": "text/plain; charset=utf-8"
  };

  var u = url.parse(UPDATE_FILE_ENDPOINT);

  request("PUT", u.hostname, path.join(u.pathname, fileId) +
    "?uploadType=media", headers, null,
    new Buffer(content, "utf8"), callback);
}

function getFile(session, callback, access_token, downloadUrl) {
  if (typeof access_token !== "string" || typeof downloadUrl !== "string") {
    return callback ? callback() : undefined;
  }

  var u = url.parse(downloadUrl);

  if (typeof u.hostname !== "string" || typeof u.path !== "string" ||
    u.hostname.slice(-1 * "googleusercontent.com".length) !==
    "googleusercontent.com") {
    return callback ? callback() : undefined;
  }

  var headers = {
    "Authorization": "Bearer " + access_token
  };

  request("GET", u.hostname, u.path, headers, null, null, callback);
}

module.exports = {
  token: token,
  metadata: metadata,
  list: list,
  deleteFile: deleteFile,
  newFile: newFile,
  updateFile: updateFile,
  getFile: getFile
};
