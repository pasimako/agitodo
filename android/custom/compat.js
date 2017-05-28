var compat = (function() {
  var C = {
    DEBUG: false,
    MSG_DELAY: 2000, // Change to 2000
    PLATFORM: "Android",
    APP_NAME: "Agitodo",
    APP_VERSION: "1.6.0",
    APP_ROOT: "/",
    TRANSITION_PAGE: false,
    IMG_SRC: "img/"
  };

  var sysFlags = {
    "userAgent": ""
  };

  function log(msg) {
    if (!C.DEBUG) {
      return;
    }
    console.log(msg);
    Android.log(msg);
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
      }
    }

    function getItem(key) {
      return (key in cache) ? cache[key] : undefined;
    }

    function setItem(key, value) {
      cache[key] = value;

      return value;
    }

    function clear() {
      cache = {};
    }

    function toString() {
      var data = {};

      for (var i in cache) {
        var parts = i.split(".");

        var key = parts.pop();
        var group = parts.join(".");

        if (!data[group]) {
          data[group] = {};
        }

        data[group][key] = cache[i];
      }

      return util.toJson(data);
    }

    // Write cache to device storage
    function persist() {
      Android.dbWrite(toString());
    }

    // Write raw data into cache/device storage
    function write(data) {
      cache = util.isObject(data) ? data : {};
      persist();
    }

    // Load device storage into cache
    function reload() {
      var txt = Android.dbRead();

      if (!txt) {
        return clear();
      }

      var data = util.fromJson(txt);

      if (!util.isObject(data)) {
        return clear();
      }

      if (util.isObject(data["agitodo.meta"])) {
        for (var i in data["agitodo.meta"]) {
          cache["agitodo.meta." + i] = data["agitodo.meta"][i];
        }
      }

      if (util.isObject(data["agitodo.tasks"])) {
        for (var i in data["agitodo.tasks"]) {
          cache["agitodo.tasks." + i] = data["agitodo.tasks"][i];
        }
      }

      if (util.isObject(data["agitodo.settings"])) {
        for (var i in data["agitodo.settings"]) {
          cache["agitodo.settings." + i] = data["agitodo.settings"][i];
        }
      }

      if (util.isObject(data["agitodo.view"])) {
        for (var i in data["agitodo.view"]) {
          cache["agitodo.view." + i] = data["agitodo.view"][i];
        }
      }
    }

    return {
      "reload": reload,
      "write": write,
      "persist": persist,
      "clear": clear,
      "setItem": setItem,
      "getItem": getItem,
      "removeItem": removeItem,
      "keys": keys,
      "size": function() {
        return util.byteCount(toString());
      }
    };
  }());

  var backend = (function() {
    var pending = [];

    function push(callback) {
      pending.push(callback);
    }

    function callback(res) {
      var status = res.status;
      var body = res.body;

      if (!pending.length) {
        return;
      }

      var exec = pending[0];
      pending.splice(0, 1);

      return exec ? ((status !== -1) ? exec(status, body) : exec()) :
        undefined;
    }

    return {
      "callback": callback,
      "push": push,
      "goBack": function() {
        return util.startsWith(session.status("currentPage"), "dg_") ?
          session.back() : compat
          .exit();
      }
    };
  }());

  var oauth = (function() {
    var POLL_WAIT = 2000;
    var active = {};

    function url(service) {
      widget.loader("Opening authorization URL...");

      var ok = Android.oauthUrl(service);

      widget.loader();

      return ok;
    }

    function stop() {
      for (var i in active) {
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

        var code = Android.oauthCode();

        countdown -= POLL_WAIT;

        if (countdown > 0 && code === "") {
          window.setTimeout(repeat, POLL_WAIT);
          return;
        }

        delete active[id];

        return callback ? callback(code ? code : undefined) :
          undefined;
      };

      repeat();
    }

    return {
      "url": url,
      "code": code,
      "stop": stop
    };
  }());

  var dropbox = {
    "token": function(code, callback) {
      backend.push(callback);
      Android.dropboxToken(code);
    },
    "fileGet": function(access_token, path, callback) {
      backend.push(callback);
      Android.dropboxFileGet(access_token, path);
    },
    "filePut": function(access_token, path, body, callback) {
      backend.push(callback);
      Android.dropboxFilePut(access_token, path, body);
    }
  };

  var gdrive = {
    "token": function(code, refresh, callback) {
      backend.push(callback);
      Android.gdriveToken(code, refresh);
    },
    "metadata": function(access_token, fileId, callback) {
      backend.push(callback);
      Android.gdriveMetadata(access_token, fileId);
    },
    "list": function(access_token, filename, callback) {
      backend.push(callback);
      Android.gdriveList(access_token, filename);
    },
    "newFile": function(access_token, filename, content, callback) {
      backend.push(callback);
      Android.gdriveNewFile(access_token, filename, content);
    },
    "updateFile": function(access_token, fileId, content, callback) {
      backend.push(callback);
      Android.gdriveUpdateFile(access_token, fileId, content);
    },
    "getFile": function(access_token, downloadUrl, callback) {
      backend.push(callback);
      Android.gdriveGetFile(access_token, downloadUrl);
    }
  };

  var hubic = {
    "token": function(code, refresh, callback) {
      backend.push(callback);
      Android.hubicToken(code, refresh);
    },
    "credentials": function(access_token, callback) {
      backend.push(callback);
      Android.hubicCredentials(access_token);
    },
    "getObject": function(openstack_token, endpoint, resource_path,
      callback) {
      backend.push(callback);
      Android.hubicGetObject(openstack_token, endpoint, resource_path);
    },
    "putObject": function(openstack_token, endpoint, resource_path,
      content, callback) {
      backend.push(callback);
      Android.hubicPutObject(openstack_token, endpoint, resource_path,
        content);
    }
  };

  var gmail = {
    "token": function(code, refresh, callback) {
      backend.push(callback);
      Android.gmailToken(code, refresh);
    },
    "send": function(access_token, to, subject, content, callback) {
      backend.push(callback);
      Android.gmailSend(access_token, to, subject, content);
    }
  };

  function exit(skipSync) {
    var done = function() {
      deviceStorage.persist();
      return Android.exitApp();
    };

    if (!skipSync && storage.settings("storage_service") &&
      storage.settings("sync_period") === "Auto") {
      var localDB = storage.exportDB();

      // Check if any changes since last sync
      if (localDB.meta.uuid === sync.last.uuid &&
        localDB.meta.encryption_verify === sync.last.encryption_verify &&
        localDB.hash === sync.last.hash) {
        return done();
      }

      sync.start(null, done);
    } else {
      return done();
    }
  }

  function convertDB(db) {
    return db;

    var version = (typeof db["agitodo.meta.version"] === "string") ? db[
        "agitodo.meta.version"]
      .split(".") : undefined;
    if (!util.isArray(version) || version.length < 2) {
      return db;
    }

    version[0] = parseInt(version[0], 10);
    version[1] = parseInt(version[1], 10);

    var app_version = C.APP_VERSION.split(".");

    app_version[0] = parseInt(app_version[0], 10);
    app_version[1] = parseInt(app_version[1], 10);

    if (app_version[0] < version[0] ||
      (app_version[0] == version[0] && app_version[1] <= version[1])) {
      return db;
    }

    var res = {};
    var key, value;

    for (var i in db) {
      key = i;
      value = db[i];

      res[key] = value;
    }

    return res;
  }

  function openURL(url) {
    Android.openURL(url);
  }

  // Check platform
  function check() {
    sys("userAgent", window.navigator.userAgent);
    log(sys("userAgent"));

    // Test for Android object
    if (typeof Android === "undefined" || Android === null) {
      status("sessionLock", "message");
      status("sessionLockData", {
        html: "<h2>Error!</h2><p>Android object undefined.</p><p style='font-size:small;'>" +
          sys("userAgent") + "</p>",
        options: [
          ["Cancel", function() {
            compat.exit(true);
          }]
        ]
      });

      return false;
    }

    return true;
  }

  // Run during session initialization
  function init(callback) {
    var callback = callback ? callback : null;

    var done = function() {
      return callback ? callback() : undefined;
    };

    // Check platform
    if (!check()) {
      return done();
    }

    // Load localStorage into cache
    deviceStorage.reload();

    // Load settings
    var settings = {};
    var keys = deviceStorage.keys();

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      if (!util.startsWith(key, "agitodo.settings.")) {
        continue;
      }

      var value = deviceStorage.getItem(key);

      if (typeof value === "undefined") {
        continue;
      }

      settings[key.slice("agitodo.settings.".length)] = value;
    }

    storage.replaceSettings(settings);

    done();
  }

  return {
    "C": function(key) {
      return C[key];
    },
    "init": init,
    "sys": sys,
    "log": log,
    "deviceStorage": deviceStorage,
    "exit": exit,
    "saveSettings": function(settings, callback) {
      return callback ? callback() : undefined;
    },
    "oauth": oauth,
    "dropbox": dropbox,
    "gdrive": gdrive,
    "hubic": hubic,
    "gmail": gmail,
    "convertDB": convertDB,
    "openURL": openURL,
    "backend": backend
  };
}());
