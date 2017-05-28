var crypto = require("crypto");

var db = require("./db");
var session = require("./session");
var oauth = require("./oauth");

var TOKEN_LENGTH = 33; // bytes

// Prototype: Settings
function Settings(data) {
  var data = (Object.prototype.toString.call(data) === "[object Object]") ?
    data : {};

  this.encryption_hash = (typeof data.encryption_hash === "string") ? data.encryption_hash :
    "";

  this.storage_service = (typeof data.storage_service === "string") ? data.storage_service :
    "";
  this.storage_dropbox = (Object.prototype.toString.call(data.storage_dropbox) ===
      "[object Object]") ?
    new oauth.Dropbox(data.storage_dropbox) : null;
  this.storage_gdrive = (Object.prototype.toString.call(data.storage_gdrive) ===
      "[object Object]") ?
    new oauth.Google(data.storage_gdrive) : null;
  this.storage_hubic = (Object.prototype.toString.call(data.storage_hubic) ===
      "[object Object]") ?
    new oauth.Hubic(data.storage_hubic) : null;
  this.sync_period = (typeof data.sync_period === "string") ? data.sync_period :
    "Manual";

  this.email_service = (typeof data.email_service === "string") ? data.email_service :
    "";
  this.email_gmail = (Object.prototype.toString.call(data.email_gmail) ===
      "[object Object]") ?
    new oauth.Google(data.email_gmail) : null;
  this.email_default = (typeof data.email_default === "string") ? data.email_default :
    "";

  this.timeFormat = (typeof data.timeFormat === "string") ? data.timeFormat :
    "12h";
  this.dateFormat = (typeof data.dateFormat === "string") ? data.dateFormat :
    "DMY";
  this.weekStarts = (typeof data.weekStarts === "string") ? data.weekStarts :
    "Mon";
}

// Prototype: Hash
function Hash(password, salt) {
  var salt = password ? (salt ? ((typeof salt === "object") ? salt : new Buffer(
      salt, "base64")) :
    crypto.randomBytes(TOKEN_LENGTH)) : null;

  this.hash = (password && salt) ? crypto.createHash("sha256").update(password,
      "utf8")
    .update(salt).digest("base64") : "";
  this.salt = (password && salt) ? salt.toString("base64") : "";
}

Hash.prototype.toString = function() {
  return this.salt + "." + this.hash;
};

Hash.prototype.fromString = function(str) {
  var parts = str.split(".");

  if (parts.length === 2) {
    this.salt = parts[0];
    this.hash = parts[1];
  }

  return this;
};

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

function validatePassword(password) {
  if (typeof password !== "string" || password.length > 100) {
    return;
  }

  // Printable ascii (excluding space)
  return new RegExp("^[!-~]{6,100}$").test(password);
}

function oauthCode(s, callback) {
  var reply = {};

  if (s.oauth.error) {
    reply.error = s.oauth.error;
  } else if (s.oauth.code) {
    reply.code = s.oauth.code;
  } else {
    reply = null;
  }

  return callback ? callback(reply) : undefined;
}

function refresh(s, callback) {
  var ok = session.refresh(s.id);

  if (callback) {
    callback(ok);
  }
}

function saveSettings(s, callback, settings) {
  if (Object.prototype.toString.call(settings) !== "[object Object]") {
    return callback ? callback() : undefined;
  }

  db.update("users", {
    settings: new Settings(settings)
  }, {
    email: s.email
  }, function(err, result) {
    if (callback) {
      callback(err ? false : true);
    }
  });
}

function logout(s, callback, settings) {
  if (Object.prototype.toString.call(settings) !== "[object Object]") {
    return callback ? callback() : undefined;
  }

  saveSettings(s, function(ok) {
    session.remove(s.id);

    if (callback) {
      callback(ok);
    }
  }, settings);
}

function loadSettings(s, callback) {
  db.select("users", {
    email: s.email
  }, function(err, result) {
    if (err || !result || result.length === 0) {
      return callback ? callback() : undefined;
    }

    if (callback) {
      callback(result[0].settings ? JSON.parse(result[0].settings) : null);
    }
  });
}

function login(email, password, callback) {
  function done(user) {
    return callback ? callback(user) : undefined;
  }

  if (!validateEmail(email) || !validatePassword(password)) {
    return done();
  }

  var email = email.toLowerCase();
  var password = password;

  db.select("users", {
    email: email
  }, function(err, result) {
    if (err || !result || result.length === 0) {
      return done();
    }

    var user = {
      email: result[0].email,
      password_hash: result[0].password_hash,
      created: result[0].created ? new Date(result[0].created) : null,
      last_login: result[0].last_login ? new Date(result[0].last_login) :
        null,
      settings: result[0].settings ? JSON.parse(result[0].settings) : null
    };

    var salt = new Hash().fromString(user.password_hash).salt;

    if (new Hash(password, salt).toString() !== user.password_hash) {
      return done();
    }

    db.update("users", {
      "last_login": new Date()
    }, {
      email: email
    });

    done(user);
  });
}

function insertUser(email, password_hash, callback) {
  function done(ok) {
    return callback ? callback(ok) : undefined;
  }

  var email = email.toLowerCase();
  var password_hash = password_hash;

  db.select("users", {
    email: email
  }, function(err, result) {
    if (err || !result || result.length > 0) {
      return done();
    }

    db.insert("users", {
      email: email,
      password_hash: password_hash,
      created: new Date()
    }, null, function(err, result) {
      done(err ? false : true);
    });
  });
}

function verifyEmail(email, token, callback) {
  function done(ok) {
    return callback ? callback(ok) : undefined;
  }

  if (!validateEmail(email)) {
    return done();
  }

  var email = email.toLowerCase();
  var token = token;

  db.select("pending", {
    email: email
  }, function(err, result) {
    if (err || !result || result.length === 0 || result[0].token !== token) {
      return done();
    }

    insertUser(email, result[0].password_hash, function(ok) {
      if (ok) {
        db.remove("pending", {
          id: result[0].id
        });
      }

      done(ok);
    });
  });
}

function signup(email, password, callback) {
  function done(err, token) {
    return callback ? callback(err, token) : undefined;
  }

  //return done("Sorry, closed beta."); // <-- REMOVE

  if (!validateEmail(email)) {
    return done("Invalid email.");
  }

  if (!validatePassword(password)) {
    return done("Invalid password.");
  }

  var email = email.toLowerCase();
  var password = password;

  db.select("users", {
    email: email
  }, function(err, result) {
    if (err || !result) {
      return done("Internal error.");
    }

    if (result.length > 0) {
      return done("User exists.");
    }

    db.select("pending", {
      email: email
    }, function(err, result) {
      if (err || !result) {
        return done("Internal error.");
      }

      var token = result.length > 0 ? result[0].token : crypto.randomBytes(
        TOKEN_LENGTH).toString(
        "base64");
      var password_hash = new Hash(password).toString();

      db.insert("pending", {
        email: email,
        password_hash: password_hash,
        created: new Date(),
        token: token
      }, {
        password_hash: password_hash
      }, function(err, result) {
        if (err) {
          return done("Internal error.");
        }

        done(null, token);
      });
    });
  });
}

module.exports = {
  login: login,
  signup: signup,
  verifyEmail: verifyEmail,
  loadSettings: loadSettings,
  logout: logout,
  saveSettings: saveSettings,
  refresh: refresh,
  oauthCode: oauthCode
};
