var crypto = require("crypto");
var querystring = require("querystring");
var url = require("url");

var request = require("./request");

var ALIAS_EXPIRES = 45 * 60000; // min -> ms
var ALIAS_LENGTH = 10; // bytes

var DROPBOX_APP_KEY = "DROPBOX_APP_KEY";
var DROPBOX_APP_SECRET = "DROPBOX_APP_SECRET";

var GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID";
var GOOGLE_CLIENT_SECRET = "GOOGLE_CLIENT_SECRET";
var GOOGLE_CLIENT_ID_DEBUG = "GOOGLE_CLIENT_ID_DEBUG";
var GOOGLE_CLIENT_SECRET_DEBUG = "GOOGLE_CLIENT_SECRET_DEBUG";

var HUBIC_CLIENT_ID = "HUBIC_CLIENT_ID";
var HUBIC_CLIENT_SECRET = "HUBIC_CLIENT_SECRET";
var HUBIC_CLIENT_ID_DEBUG = "HUBIC_CLIENT_ID_DEBUG";
var HUBIC_CLIENT_SECRET_DEBUG = "HUBIC_CLIENT_SECRET_DEBUG";

var OAUTH_REDIRECT_URI = "https://example.com/oauth-code";
var OAUTH_REDIRECT_URI_DEBUG = "http://localhost:8081/oauth-code";

var DROPBOX_AUTH_ENDPOINT = "https://www.dropbox.com/1/oauth2/authorize";
var GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/auth";
var HUBIC_AUTH_ENDPOINT = "https://api.hubic.com/oauth/auth";

var DROPBOX_TOKEN_ENDPOINT = "https://api.dropbox.com/1/oauth2/token";
var GOOGLE_TOKEN_ENDPOINT = "https://accounts.google.com/o/oauth2/token";
var HUBIC_TOKEN_ENDPOINT = "https://api.hubic.com/oauth/token";

var SERVICE = {
  DROPBOX: 0,
  GDRIVE: 1,
  GMAIL: 2,
  HUBIC: 3,
  0: "DROPBOX",
  1: "GDRIVE",
  2: "GMAIL",
  3: "HUBIC"
};

// Prototype: Dropbox
function Dropbox(data) {
  var data = (Object.prototype.toString.call(data) === "[object Object]") ?
    data : {};

  this.access_token = (typeof data.access_token === "string") ? data.access_token :
    "";
  this.access_token_expires = (typeof data.access_token_expires === "number") ?
    data.access_token_expires : -1;
};

// Prototype: Google
function Google(data) {
  var data = (Object.prototype.toString.call(data) === "[object Object]") ?
    data : {};

  this.access_token = (typeof data.access_token === "string") ? data.access_token :
    "";
  this.access_token_expires = (typeof data.access_token_expires === "number") ?
    data.access_token_expires : -1;
  this.refresh_token = (typeof data.refresh_token === "string") ? data.refresh_token :
    "";
};

// Prototype: Hubic
function Hubic(data) {
  var data = (Object.prototype.toString.call(data) === "[object Object]") ?
    data : {};

  this.access_token = (typeof data.access_token === "string") ? data.access_token :
    "";
  this.access_token_expires = (typeof data.access_token_expires === "number") ?
    data.access_token_expires : -1;
  this.refresh_token = (typeof data.refresh_token === "string") ? data.refresh_token :
    "";
  this.openstack_token = (typeof data.openstack_token === "string") ? data.openstack_token :
    "";
  this.openstack_token_expires = (typeof data.openstack_token_expires ===
      "number") ?
    data.openstack_token_expires : -1;
  this.openstack_endpoint = (typeof data.openstack_endpoint === "string") ?
    data.openstack_endpoint :
    "";
};

var alias = (function() {
  var cache = {};

  function removeExpired() {
    var now = new Date().getTime();

    for (var i in cache) {
      if ((now - cache[i].time) >= ALIAS_EXPIRES) {
        delete cache[i];
      }
    }
  }

  function pop(token) {
    if (typeof token !== "string" || token.length > (ALIAS_LENGTH * 2) ||
      !cache.hasOwnProperty(token)) {
      return;
    }

    var item = cache[token];
    delete cache[token];

    return ((new Date().getTime() - item.time) < ALIAS_EXPIRES) ? item.sid :
      undefined;
  }

  function push(sid) {
    removeExpired();

    var token;

    do {
      token = crypto.randomBytes(ALIAS_LENGTH).toString("hex");
    } while (token in cache);

    cache[token] = {
      sid: sid,
      time: new Date().getTime()
    };

    return token;
  }

  return {
    push: push,
    pop: pop
  };
})();

function authURL(session, service) {
  var endpoint;
  var params = {
    response_type: "code",
    redirect_uri: session.debug ? OAUTH_REDIRECT_URI_DEBUG : OAUTH_REDIRECT_URI
  };

  switch (service) {
    case SERVICE.DROPBOX:
      endpoint = DROPBOX_AUTH_ENDPOINT;
      params.client_id = DROPBOX_APP_KEY;
      params.force_reapprove = "true";
      break;
    case SERVICE.GDRIVE:
      endpoint = GOOGLE_AUTH_ENDPOINT;
      params.client_id = session.debug ? GOOGLE_CLIENT_ID_DEBUG :
        GOOGLE_CLIENT_ID;
      params.scope = "https://www.googleapis.com/auth/drive.appdata";
      params.include_granted_scopes = "false";
      if (!session.debug) {
        params.access_type = "offline";
        params.approval_prompt = "force";
      }
      break;
    case SERVICE.GMAIL:
      endpoint = GOOGLE_AUTH_ENDPOINT;
      params.client_id = session.debug ? GOOGLE_CLIENT_ID_DEBUG :
        GOOGLE_CLIENT_ID;
      params.scope = "https://www.googleapis.com/auth/gmail.compose";
      params.include_granted_scopes = "false";
      if (!session.debug) {
        params.access_type = "offline";
        params.approval_prompt = "force";
      }
      break;
    case SERVICE.HUBIC:
      endpoint = HUBIC_AUTH_ENDPOINT;
      params.client_id = session.debug ? HUBIC_CLIENT_ID_DEBUG :
        HUBIC_CLIENT_ID;
      params.scope = "credentials.r";
      break;
    default:
      return "/";
  }

  params.state = alias.push(session.id);
  session.oauth.state = params.state;

  return endpoint + "?" + querystring.stringify(params);
}

function token(session, service, code, refresh, callback) {
  if (typeof code !== "string") {
    return callback ? callback() : undefined;
  }

  var endpoint;
  var params = {};

  if (refresh) {
    params.refresh_token = code;
    params.grant_type = "refresh_token";
  } else {
    params.code = code;
    params.grant_type = "authorization_code";
    params.redirect_uri = session.debug ? OAUTH_REDIRECT_URI_DEBUG :
      OAUTH_REDIRECT_URI;
  }

  switch (service) {
    case SERVICE.DROPBOX:
      endpoint = DROPBOX_TOKEN_ENDPOINT;
      params.client_id = DROPBOX_APP_KEY;
      params.client_secret = DROPBOX_APP_SECRET;
      break;
    case SERVICE.GDRIVE:
    case SERVICE.GMAIL:
      endpoint = GOOGLE_TOKEN_ENDPOINT;
      params.client_id = session.debug ? GOOGLE_CLIENT_ID_DEBUG :
        GOOGLE_CLIENT_ID;
      params.client_secret = session.debug ? GOOGLE_CLIENT_SECRET_DEBUG :
        GOOGLE_CLIENT_SECRET;
      break;
    case SERVICE.HUBIC:
      endpoint = HUBIC_TOKEN_ENDPOINT;
      params.client_id = session.debug ? HUBIC_CLIENT_ID_DEBUG :
        HUBIC_CLIENT_ID;
      params.client_secret = session.debug ? HUBIC_CLIENT_SECRET_DEBUG :
        HUBIC_CLIENT_SECRET;
      break;
    default:
      return callback ? callback() : undefined;
  }

  var body = querystring.stringify(params);

  var headers = {
    "Content-Type": "application/x-www-form-urlencoded"
  };

  var u = url.parse(endpoint);

  request("POST", u.hostname, u.pathname, headers, null, body, callback);
}

module.exports = {
  alias: alias,
  authURL: authURL,
  token: token,
  SERVICE: SERVICE,
  Dropbox: Dropbox,
  Google: Google,
  Hubic: Hubic
};
