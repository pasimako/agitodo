var crypto = require("crypto");

var DEBUG = true; // FOR PRODUCTION -> false
var COOKIE_NAME = "agitodo.sid";
var TOKEN_LENGTH = 33; // bytes
var SESSION_EXPIRES = 24 * 3600000; // h to ms
var CLEAN_INTERVAL = 1 * 3600000; // h to ms

// Prototype: Session
function Session(id, ip) {
  this.id = id;
  this.ip = ip;
  this.last_seen = new Date().getTime();
  this.authenticated = false;
  this.email = null;
  this.oauth = {
    state: null,
    code: null,
    error: null
  };
  this.debug = DEBUG ? true : false;
}

Session.prototype.hasExpired = function() {
  return (new Date().getTime() - this.last_seen) > SESSION_EXPIRES;
};

Session.prototype.refresh = function() {
  this.last_seen = new Date().getTime();
};

Session.prototype.update = function(data) {
  for (var i in data) {
    if (!this.hasOwnProperty(i)) {
      continue;
    }

    this[i] = data[i];
  }
};

Session.prototype.resetOAuth = function() {
  this.oauth.state = null;
  this.oauth.code = null;
  this.oauth.error = null;
};

var sessions = {};

function remove(id) {
  if (typeof id === "string" && sessions.hasOwnProperty(id)) {
    delete sessions[id];
  }
}

function find(id) {
  if (typeof id !== "string" || !sessions.hasOwnProperty(id)) {
    return;
  }

  var s = sessions[id];

  if (s.hasExpired()) {
    remove(id);
    return;
  }

  return s;
}

function refresh(id) {
  var s = find(id);

  if (s) {
    s.refresh();
    return true;
  }
}

function load(req) {
  var s = find(req.signedCookies[COOKIE_NAME]);

  if (s) {
    s.update({
      ip: req.ip
    });
    s.refresh();
    return s;
  }
}

function update(req, data) {
  if (!data) {
    return;
  }

  var s = load(req);

  if (s) {
    s.update(data);
    return s;
  }
}

function create(req, res) {
  var s = load(req);

  if (!s) {
    var id;

    do {
      id = crypto.randomBytes(TOKEN_LENGTH).toString("base64");
    } while (id in sessions);

    s = sessions[id] = new Session(id, req.ip);

    // FOR PRODUCTION: secure -> true
    res.cookie(COOKIE_NAME, id, {
      path: "/",
      signed: true,
      httpOnly: true,
      secure: DEBUG ? false : true
    });
  }

  return s;
}

// Initialize module
(function() {
  // Remove expired sessions
  setInterval(function() {
    var now = new Date().getTime();

    for (var id in sessions) {
      if ((now - sessions[id].last_seen) >= SESSION_EXPIRES) {
        remove(id);
      }
    }
  }, CLEAN_INTERVAL);
})();

module.exports = {
  create: create,
  load: load,
  update: update,
  remove: remove,
  refresh: refresh,
  find: find
};
