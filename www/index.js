function sendFile(filename, root, res) {
  while (filename.charAt(0) === "/") {
    filename = filename.slice(1);
  }

  if (!filename || filename.charAt(0) === "." || !root) {
    return res.sendStatus(404);
  }

  var options = {
    root: root,
    dotfiles: "deny"
  };

  res.sendFile(filename, options, function(err) {
    if (err) {
      if (err.code === "ECONNABORT" && res.statusCode == 304) {
        console.log("304 cache hit for " + filename);
        return;
      }

      console.log(err);

      if (err.status) {
        res.status(err.status).end();
      }
    }
  });
}

(function() {
  var fs = require("fs");
  var path = require("path");
  var crypto = require("crypto");

  var express = require("express");
  var morgan = require("morgan");
  var bodyParser = require("body-parser");
  var cookieParser = require("cookie-parser");

  var logger = require("./logger");
  var session = require("./session");
  var user = require("./user");
  var mailer = require("./mailer");
  var jsonrpc = require("./jsonrpc");
  var oauth = require("./oauth");

  var APP_NAME = "www";
  var APP_PORT = 8081;
  var APP_HOST = "localhost";
  var TOKEN_LENGTH = 33; // bytes

  var publicPath = path.join(__dirname, "public");
  var appPath = path.join(__dirname, "app");
  var accessLog = path.join(__dirname, "log/access.log");

  var app = express();

  app.enable("trust proxy");

  app.use(morgan("combined", {
    skip: function(req, res) {
      return res.statusCode === 304;
    },
    stream: fs.createWriteStream(accessLog, {
      flags: "a"
    })
  }));

  app.use(bodyParser.json({
    limit: "10mb"
  }));

  app.use(cookieParser(crypto.randomBytes(TOKEN_LENGTH).toString("base64")));

  //Login (user/password), Signup (user/password), Contact (name/email/msg), JSON-RPC
  app.post("/", function(req, res, next) {
    if (!req.is("application/json")) {
      return next();
    }

    if (Object.prototype.toString.call(req.body) !== "[object Object]") {
      return res.status(400).send(); // 400 Bad Request
    }

    var s = session.load(req);

    if (!s) {
      logger.warning({
        "reason": "Invalid session (post)",
        "ip": req.ip
      });

      res.clearCookie("agitodo.sid", {
        path: "/"
      });

      return res.status(403).send(); // 403 Forbidden
    }

    if (typeof req.body.jsonrpc === "string") {
      if (!s.authenticated) {
        return res.status(403).send(); // 403 Forbidden
      }

      jsonrpc(s, req, res);
    } else if (typeof req.body.action === "string") {
      var reply = {
        "ok": false,
        "msg": ""
      };

      switch (req.body.action) {
        case "login":
          if (typeof req.body.email !== "string" || typeof req.body.password !==
            "string") {
            return res.status(400).send(); // 400 Bad Request
          }

          var email = req.body.email;
          var password = req.body.password;

          user.login(email, password, function(user) {
            if (!user) {
              logger.warning({
                reason: "Login refused",
                email: email,
                ip: req.ip
              });

              return res.json(reply);
            }

            logger.info({
              reason: "User login",
              email: email,
              ip: req.ip
            });

            session.update(req, {
              authenticated: true,
              email: email
            });

            reply.ok = true;
            res.json(reply);
          });
          break;
        case "contact":
          if (typeof req.body.name !== "string" || typeof req.body.email !==
            "string" ||
            typeof req.body.msg !== "string" || !req.body.name || !req.body
            .email ||
            !req.body.msg) {
            return res.status(400).send(); // 400 Bad Request
          }

          logger.info({
            "reason": "mailer.contact",
            "ip": req.ip,
            "name": req.body.name,
            "email": req.body.email
          });

          mailer.contact(req.body.name, req.body.email, req.body.msg,
            function(ok) {
              reply.ok = ok ? true : false;
              res.json(reply);
            });
          break;
        case "signup":
          if (typeof req.body.email !== "string" || typeof req.body.password !==
            "string") {
            return res.status(400).send(); // 400 Bad Request
          }

          var email = req.body.email;
          var password = req.body.password;

          user.signup(email, password, function(err, token) {
            if (err) {
              reply.ok = false;
              reply.msg = err;
              return res.json(reply);
            }

            mailer.verify(email, token, function(ok) {
              if (ok) {
                logger.info({
                  reason: "user.signup",
                  ip: req.ip,
                  email: email
                });

                reply.ok = true;
                reply.msg = "";
              } else {
                reply.ok = false;
                reply.msg = "Internal error.";
              }
              res.json(reply);
            });

          });
          break;
        default:
          return res.status(400).send(); // 400 Bad Request
      }
    } else {
      return res.status(400).send(); // 400 Bad Request
    }
  });

  // Verify email address
  app.get("/verify", function(req, res, next) {
    if (typeof req.query.email !== "string" || typeof req.query.token !==
      "string") {
      return res.status(400).send(
        "<h1>400 Bad Request</h1><h2>Cannot GET " + req.url + "</h2>");
    }

    user.verifyEmail(req.query.email, req.query.token, function(ok) {
      if (!ok) {
        return res.status(400).send(
          "<h1>400 Bad Request</h1><h2>Cannot GET " + req.url +
          "</h2>");
      }

      res.redirect("/");
    });
  });

  // OAuth authorization url
  app.get("/oauth-url", function(req, res, next) {
    var s = session.load(req);

    if (!s || !s.authenticated) {
      logger.warning({
        "reason": "Invalid session (oauth-url)",
        "ip": req.ip
      });

      res.clearCookie("agitodo.sid", {
        path: "/"
      });

      return res.status(403).send("<h1>403 Forbidden</h1><h2>Cannot GET " +
        req.url + "</h2>");
    }

    if (typeof req.query.service !== "string") {
      return res.status(400).send(
        "<h1>400 Bad Request</h1><h2>Cannot GET " + req.url + "</h2>");
    }

    var n = parseInt(req.query.service);

    if (isNaN(n) || !oauth.SERVICE.hasOwnProperty(n)) {
      return res.status(400).send(
        "<h1>400 Bad Request</h1><h2>Cannot GET " + req.url + "</h2>");
    }

    s.resetOAuth();

    res.redirect(oauth.authURL(s, n));
  });

  // OAuth authorization code
  app.get("/oauth-code", function(req, res, next) {
    if (typeof req.query.state !== "string" ||
      (typeof req.query.code !== "string" && typeof req.query.error !==
        "string")) {
      return res.status(400).send(
        "<h1>400 Bad Request</h1><h2>Cannot GET " + req.url + "</h2>");
    }

    var s = session.find(oauth.alias.pop(req.query.state));

    if (!s || s.oauth.state !== req.query.state) {
      logger.warning({
        "reason": "/oauth-code Invalid STATE",
        "ip": req.ip
      });

      return res.status(400).send(
        "<h1>400 Bad Request</h1><h2>Cannot GET " + req.url + "</h2>");
    }

    s.oauth.state = null;
    s.oauth.code = req.query.code;
    s.oauth.error = req.query.error;

    sendFile("close.html", publicPath, res);
  });

  app.get("/", function(req, res, next) {
    session.create(req, res);
    next();
  });

  app.get("/app/*", function(req, res, next) {
    var s = session.load(req);

    if (!s || !s.authenticated) {
      return res.redirect("/");
    }

    var p = (typeof req.path === "string") ? req.path : "";

    if (p.length > 200) {
      return res.sendStatus(400);
    }

    var filename = (p.indexOf("/app/") === 0) ? p.substring("/app/".length) :
      p;

    if (!filename) {
      filename = "index.html";
    }

    sendFile(filename, appPath, res);
  });

  app.use(express.static(publicPath));

  console.log(APP_NAME + " listening on " + (APP_HOST ? APP_HOST : "*") + ":" +
    APP_PORT + "...");

  app.listen(APP_PORT, APP_HOST);
})();
