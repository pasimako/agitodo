var url = require("url");
var path = require("path");

var request = require("./request");
var oauth = require("./oauth");

var CREDENTIALS_ENDPOINT = "https://api.hubic.com/1.0/account/credentials";

function token(session, callback, code, refresh) {
  if (typeof code !== "string" || !code) {
    return callback ? callback() : undefined;
  }

  oauth.token(session, oauth.SERVICE.HUBIC, code, refresh, callback);
}

function credentials(session, callback, access_token) {
  if (typeof access_token !== "string") {
    return callback ? callback() : undefined;
  }

  var headers = {
    "Authorization": "Bearer " + access_token
  };

  var u = url.parse(CREDENTIALS_ENDPOINT);

  request("GET", u.hostname, u.pathname, headers, null, null, callback);
}

function getObject(session, callback, token, endpoint, resource_path) {
  if (typeof token !== "string" || typeof endpoint !== "string" ||
    typeof resource_path !== "string") {
    return callback ? callback() : undefined;
  }

  while (resource_path.charAt(0) === "/") {
    resource_path = resource_path.slice(1);
  }

  var headers = {
    "X-Auth-Token": token
  };

  var u = url.parse(endpoint);

  if (typeof u.hostname !== "string" || typeof u.pathname !== "string" ||
    u.hostname.slice(-1 * "hubic.ovh.net".length) !== "hubic.ovh.net") {
    return callback ? callback() : undefined;
  }

  request("GET", u.hostname, path.join(u.pathname, resource_path) +
    "?format=json", headers, null,
    null, callback);
}

function putObject(session, callback, token, endpoint, resource_path, content) {
  if (typeof token !== "string" || typeof endpoint !== "string" ||
    typeof resource_path !== "string" || typeof content !== "string") {
    return callback ? callback() : undefined;
  }

  while (resource_path.charAt(0) === "/") {
    resource_path = resource_path.slice(1);
  }

  var headers = {
    "X-Auth-Token": token,
    "Content-Type": "text/plain; charset=utf-8"
  };

  var u = url.parse(endpoint);

  if (typeof u.hostname !== "string" || typeof u.pathname !== "string" ||
    u.hostname.slice(-1 * "hubic.ovh.net".length) !== "hubic.ovh.net") {
    return callback ? callback() : undefined;
  }

  request("PUT", u.hostname, path.join(u.pathname, resource_path), headers,
    null, new Buffer(
      content, "utf8"), callback);
}

module.exports = {
  token: token,
  credentials: credentials,
  getObject: getObject,
  putObject: putObject
};
