/**
 * Creates a test account
 */

var crypto = require("crypto");
var db = require("../db");

var TOKEN_LENGTH = 33; // bytes

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

// Test account
insertUser("test@example.com", new Hash("PASSWORD").toString());
