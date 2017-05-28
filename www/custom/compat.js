var compat = (function() {
  var C = {
    DEBUG : true,
    MSG_DELAY : 2000,
    SID_REFRESH : 45 * 60000, // milliseconds -> minutes
    PLATFORM : "www",
    APP_NAME : "Agitodo",
    APP_VERSION : "1.6.0",
    APP_ROOT : "/",
    TRANSITION_PAGE : true,
    IMG_SRC : "img/"
  };

  var sysFlags = {
    "userAgent" : ""
  };

  var localStorageDisabled = false;
  var refreshSIDTimeoutID = null;

  function log(msg) {
    if (!C.DEBUG) {
      return;
    }
    console.log(msg);
  }

  function sys(key, value) {
    if (typeof value !== "undefined") {
      sysFlags[key] = value;
    }
    return sysFlags[key];
  }

  var deviceStorage = (function() {
    var cache = {};

    function keys() {
      return Object.keys(cache);
    }

    function removeItem(key) {
      if (key in cache) {
        delete cache[key];
        window.localStorage.removeItem(key);
      }
    }

    function getItem(key) {
      return (key in cache) ? cache[key] : undefined;
    }

    function setItem(key, value) {
      cache[key] = value;

      if (!localStorageDisabled
        && !util.startsWith(key, "agitodo.settings.")) {
        window.localStorage.setItem(key, util.toJson(value));
      }

      return value;
    }

    function clear() {
      cache = {};
      window.localStorage.clear();
    }

    // Write cache to localStorage
    function persist() {
      window.localStorage.clear();

      if (localStorageDisabled) {
        return;
      }

      for ( var i in cache) {
        if (util.startsWith(key, "agitodo.settings.")) {
          continue;
        }

        window.localStorage.setItem(i, util.toJson(cache[i]));
      }
    }

    // Write raw data into cache/localStorage
    function write(data) {
      var data = util.isObject(data) ? data : {};

      clear();

      for ( var i in data) {
        setItem(i, data[i]);
      }
    }

    // Load localStorage into cache
    function reload() {
      var keys = Object.keys(window.localStorage);

      for (var i = 0; i < keys.length; i++) {
        var value = util.fromJson(window.localStorage.getItem(keys[i]));

        if (typeof value === "undefined") {
          continue;
        }

        cache[keys[i]] = value;
      }
    }

    return {
      "reload" : reload,
      "write" : write,
      "persist" : persist,
      "clear" : clear,
      "setItem" : setItem,
      "getItem" : getItem,
      "removeItem" : removeItem,
      "keys" : keys,
      "size" : function() {
        return util.byteCount(util.toJson(cache));
      }
    };
  }());

  var backend = (function() {
    var id = 0;

    function rpc(method, params, callback) {
      var callback = (typeof callback === "function") ? callback : null;

      var body = JSON.stringify({
        "jsonrpc" : "2.0",
        "method" : method,
        "params" : params,
        "id" : ++id
      });

      var req = new XMLHttpRequest();
      req.open("POST", "/", true);
      req.setRequestHeader("Content-type", "application/json");

      req.onload = function(e) {
        var result;

        if (req.status === 200) {
          var data = util.fromJson(req.responseText);

          if (Object.prototype.toString.call(data) === "[object Object]") {
            if (data.error) {
              log(data.error);
            } else if (typeof data.result !== "undefined") {
              result = data.result;
            }
          }
        }

        if (callback) {
          return (Object.prototype.toString.call(result) === "[object Array]")
            ? callback.apply(null, result) : callback(result);
        }
      };

      req.onerror = function(e) {
        log(e);
        return callback ? callback() : undefined;
      };

      try {
        req.send(body);
      } catch (e) {
        log(e);
        return callback ? callback() : undefined;
      }
    }

    function start() {
      if (arguments.length < 1 || typeof arguments[0] !== "string") {
        return;
      }

      var method = arguments[0];
      var params = Array.prototype.slice.call(arguments, 1);
      var callback = (params.length > 0 && typeof params[params.length - 1] === "function")
        ? params.pop() : null;

      if (C.DEBUG) { // Add short delay for debugging
        window.setTimeout(function() {
          rpc(method, params, callback);
        }, 200);
      } else {
        rpc(method, params, callback);
      }
    }

    return start;
  }());

  var oauth = (function() {
    var POLL_WAIT = 2000;
    var active = {};

    function url(service) {
      return window.open("/oauth-url?service=" + service);
    }

    function stop() {
      for ( var i in active) {
        try {
          active[i] = false;
        } catch (e) {
          continue;
        }
      }
    }

    function code(callback) {
      var callback = callback ? callback : null;

      stop(); // Force stop previous polls

      var countdown = 10 * 60000; // milliseconds -> minutes
      var id = "";

      do {
        id = util.randomString(4, true);
      } while (id in active);

      active[id] = true;

      var repeat = function() {
        if (!active[id]) {
          delete active[id];
          return;
        }

        countdown -= POLL_WAIT;

        backend("user.oauthCode", function(data) {
          if (countdown > 0 && data === null) {
            return window.setTimeout(repeat, POLL_WAIT);
          }

          delete active[id];

          return callback ? callback((util.isObject(data) && data.code)
            ? data.code : undefined) : undefined;
        });
      };

      repeat();
    }

    return {
      "url" : url,
      "code" : code,
      "stop" : stop
    };
  }());

  var dropbox = {
    "token" : function(code, callback) {
      backend("dropbox.token", code, callback);
    },
    "fileGet" : function(access_token, path, callback) {
      backend("dropbox.file_get", access_token, path, callback);
    },
    "filePut" : function(access_token, path, body, callback) {
      backend("dropbox.file_put", access_token, path, body, callback);
    }
  };

  var gdrive = {
    "token" : function(code, refresh, callback) {
      backend("gdrive.token", code, refresh, callback);
    },
    "metadata" : function(access_token, fileId, callback) {
      backend("gdrive.metadata", access_token, fileId, callback);
    },
    "list" : function(access_token, filename, callback) {
      backend("gdrive.list", access_token, filename, callback);
    },
    "newFile" : function(access_token, filename, content, callback) {
      backend("gdrive.newFile", access_token, filename, content, callback);
    },
    "updateFile" : function(access_token, fileId, content, callback) {
      backend("gdrive.updateFile", access_token, fileId, content, callback);
    },
    "getFile" : function(access_token, downloadUrl, callback) {
      backend("gdrive.getFile", access_token, downloadUrl, callback);
    }
  };

  var hubic = {
    "token" : function(code, refresh, callback) {
      backend("hubic.token", code, refresh, callback);
    },
    "credentials" : function(access_token, callback) {
      backend("hubic.credentials", access_token, callback);
    },
    "getObject" : function(openstack_token, endpoint, resource_path, callback) {
      backend("hubic.getObject", openstack_token, endpoint, resource_path,
        callback);
    },
    "putObject" : function(openstack_token,
      endpoint,
      resource_path,
      content,
      callback) {
      backend("hubic.putObject", openstack_token, endpoint, resource_path,
        content, callback);
    }
  };

  var gmail = {
    "token" : function(code, refresh, callback) {
      backend("gmail.token", code, refresh, callback);
    },
    "send" : function(access_token, to, subject, content, callback) {
      backend("gmail.send", access_token, to, subject, content, callback);
    }
  };

  function getCookie(name) {
    if (!document.cookie) {
      return;
    }

    var start = document.cookie.indexOf(name + "=");

    if (start == -1) {
      return;
    }

    start += name.length + 1;

    var end = document.cookie.indexOf(";", start);

    if (end == -1) {
      end = document.cookie.length;
    }

    return decodeURIComponent(document.cookie.substring(start, end));
  }

  function saveSettings(settings, callback) {
    var callback = (callback) ? callback : null;

    backend("user.saveSettings", settings, function(result) {
      if (callback) {
        callback(result);
      }
    });
  }

  function loadSettings(callback) {
    var callback = (callback) ? callback : null;

    backend("user.loadSettings", function(result) {
      if (callback) {
        callback(result);
      }
    });
  }

  function exit(skipSync) {
    var done = function() {
      return session.reload();
    };

    var phase2 = function() {
      session.loader("Logging out...");

      backend("user.logout", storage.settings(), function(result) {
        if (result) {
          done();
        } else {
          widget.loader("Connection error", true, C.MSG_DELAY);
          window.setTimeout(done, compat.C("MSG_DELAY"));
        }
      });
    };

    window.clearTimeout(refreshSIDTimeoutID); // Clear any sid refresh timeout

    if (!skipSync && storage.settings("storage_service")
      && storage.settings("sync_period") === "Auto") {
      var localDB = storage.exportDB();

      // Check if any changes since last sync
      if (localDB.meta.uuid === sync.last.uuid
        && localDB.meta.encryption_verify === sync.last.encryption_verify
        && localDB.hash === sync.last.hash) {
        return phase2();
      }

      sync.start(null, phase2);
    } else {
      return phase2();
    }
  }

  function refreshSID() {
    backend("user.refresh", function(result) {
      if (result) {
        log("SID refreshed");
        refreshSIDTimeoutID = window.setTimeout(refreshSID, compat
            .C("SID_REFRESH"));
      } else {
        log("SID expired");
        if (!C.DEBUG) {
          session.reload();
        }
      }
    });
  }

  function convertDB(db) {
    return db;

    var version = (typeof db["agitodo.meta.version"] === "string")
      ? db["agitodo.meta.version"].split(".") : undefined;
    if (!util.isArray(version) || version.length < 2) {
      return db;
    }

    version[0] = parseInt(version[0], 10);
    version[1] = parseInt(version[1], 10);

    var app_version = C.APP_VERSION.split(".");

    app_version[0] = parseInt(app_version[0], 10);
    app_version[1] = parseInt(app_version[1], 10);

    if (app_version[0] < version[0]
      || (app_version[0] == version[0] && app_version[1] <= version[1])) {
      return db;
    }

    var res = {};
    var key, value;

    for ( var i in db) {
      key = i;
      value = db[i];

      res[key] = value;
    }

    return res;
  }

  function openURL(url) {
    window.open(url);
  }

  /* Check platform */
  function check() {
    sys("userAgent", window.navigator.userAgent);

    log(sys("userAgent"));

    if (getCookie("PUB") === "1") {
      localStorageDisabled = true;
      window.localStorage.clear();
    } else {
      try { // Test for localStorage
        window.localStorage.setItem("agitodo.test", "agitodo.test");
        window.localStorage.removeItem("agitodo.test");
      } catch (e) {
        status("sessionLock", "message");
        status(
          "sessionLockData",
          {
            html : "<h2>Error!</h2><p>DOM Storage is NOT supported on this platform.</p>"
              + "<p style='font-size:small;'>" + sys("userAgent") + "</p>",
            options : [ [ "Cancel", function() {
              compat.exit(true);
            } ] ]
          });

        return false;
      }
    }

    return true;
  }

  // Run during session initialization
  function init(callback) {
    var callback = callback ? callback : null;

    var done = function() {
      refreshSID();
      return callback ? callback() : undefined;
    };

    // Check platform
    if (!check()) {
      return done();
    }

    // Load settings from server
    var phase2 = function() {
      widget.loader("Loading settings...");

      loadSettings(function(result) {
        if (result && !$.isEmptyObject(result)) {
          storage.replaceSettings(result);
        }

        if (typeof result !== "undefined") {
          widget.loader();
          done();
        } else {
          widget.loader("Connection error", true, compat.C("MSG_DELAY"));
          window.setTimeout(done, compat.C("MSG_DELAY"));
        }
      });
    };

    // Load localStorage into cache
    deviceStorage.reload();

    phase2();
  }

  return {
    "C" : function(key) {
      return C[key];
    },
    "init" : init,
    "sys" : sys,
    "log" : log,
    "deviceStorage" : deviceStorage,
    "exit" : exit,
    "saveSettings" : saveSettings,
    "oauth" : oauth,
    "dropbox" : dropbox,
    "gdrive" : gdrive,
    "hubic" : hubic,
    "gmail" : gmail,
    "convertDB" : convertDB,
    "openURL" : openURL
  };
}());
