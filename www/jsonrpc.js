var logger = require("./logger");
var user = require("./user");
var dropbox = require("./dropbox");
var gdrive = require("./gdrive");
var hubic = require("./hubic");
var gmail = require("./gmail");

var MAX_METHOD_LENGTH = 30;
var MAX_ARGUMENTS = 5;

var methods_enabled = {
  "user.logout": user.logout,
  "user.refresh": user.refresh,
  "user.saveSettings": user.saveSettings,
  "user.loadSettings": user.loadSettings,
  "user.oauthCode": user.oauthCode,

  "dropbox.token": dropbox.token,
  "dropbox.file_get": dropbox.file_get,
  "dropbox.file_put": dropbox.file_put,

  "gdrive.token": gdrive.token,
  "gdrive.metadata": gdrive.metadata,
  "gdrive.list": gdrive.list,
  "gdrive.newFile": gdrive.newFile,
  "gdrive.updateFile": gdrive.updateFile,
  "gdrive.getFile": gdrive.getFile,

  "hubic.token": hubic.token,
  "hubic.credentials": hubic.credentials,
  "hubic.getObject": hubic.getObject,
  "hubic.putObject": hubic.putObject,

  "gmail.token": gmail.token,
  "gmail.send": gmail.send
};

function jsonrpc(session, req, res) {
  if (Object.prototype.toString.call(req.body) !== "[object Object]" ||
    typeof req.body.jsonrpc !== "string") {
    return res.status(400).send(); // 400 Bad Request
  }

  var reply = {
    "jsonrpc": "2.0",
    "id": (typeof req.body.id === "number") ? req.body.id : null
  };

  if (req.body.jsonrpc !== "2.0" || typeof req.body.method !== "string" ||
    req.body.method.length > MAX_METHOD_LENGTH ||
    Object.prototype.toString.call(req.body.params) !== "[object Array]" ||
    req.body.params.length > MAX_ARGUMENTS) {
    logger.warning({
      "reason": "RPC Invalid request",
      "ip": req.ip,
      "email": session.email,
      "sid": session.id
    });

    reply.error = {
      "code": -32600,
      "message": "Invalid Request"
    };

    return res.json(reply);
  }

  if (!methods_enabled.hasOwnProperty(req.body.method)) {
    logger.warning({
      "reason": "RPC Method not found",
      "ip": req.ip,
      "email": session.email,
      "sid": session.id,
      "method": req.body.method
    });

    reply.error = {
      "code": -32601,
      "message": "Method not found"
    };

    return res.json(reply);
  }

  logger.info({
    "reason": "RPC OK",
    "ip": req.ip,
    "email": session.email,
    "sid": session.id,
    "method": req.body.method
  });

  var res = res;

  var callback = function() {
    reply.result = Array.prototype.slice.call(arguments);
    res.json(reply);
  };

  methods_enabled[req.body.method].apply(null, [session, callback].concat(req.body
    .params));
}

module.exports = jsonrpc;
