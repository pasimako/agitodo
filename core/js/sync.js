var sync = (function() {
  var FILE_META = "agitodo.meta.json";
  var FILE_DB = "agitodo.db.json";

  var last = {
    uuid: "",
    encryption_verify: "",
    hash: ""
  };

  var dropbox = (function() {
    function upload(filename, content, callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      new OAuth(OAuth.SERVICE_DROPBOX, function(status, body) {
        if (status !== 200 || typeof body !== "string") {
          return callback();
        }

        callback(util.fromJson(body));
      }).request(compat.dropbox.filePut, "/" + filename, content);
    }

    function download(filename, callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      new OAuth(OAuth.SERVICE_DROPBOX, function(status, body) {
        if (status === 200 && typeof body === "string") {
          callback(body);
        } else if (status === 404) {
          callback(null); // File NOT FOUND
        } else {
          callback();
        }
      }).request(compat.dropbox.fileGet, "/" + filename);
    }

    return {
      "upload": upload,
      "download": download
    };
  }());

  var gdrive = (function() {
    var cache = {};

    function upload(filename, content, callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      var filename = filename,
        content = content,
        fileId = cache[filename];

      if (fileId) {
        new OAuth(OAuth.SERVICE_GDRIVE, function(status, body) {
          if (status === 404) { // Invalid cached id, try again
            compat.log("gdrive.upload: Invalid cached id");
            delete cache[filename];
            return upload(filename, content, callback);
          }

          callback((status === 200 && typeof body === "string") ?
            util
            .fromJson(body) : undefined);
        }).request(compat.gdrive.updateFile, fileId, content);
      } else {
        new OAuth(OAuth.SERVICE_GDRIVE,
          function(status, body) {
            var response = (status === 200 && typeof body ===
                "string") ? util
              .fromJson(body) : undefined;

            if (!response || !util.isArray(response.items)) {
              return callback();
            }

            var fileId = response.items.length ? response.items[0].id :
              undefined;

            if (fileId) {
              cache[filename] = fileId;

              new OAuth(OAuth.SERVICE_GDRIVE, function(status, body) {
                callback((status === 200 && typeof body ===
                    "string") ? util
                  .fromJson(body) : undefined);
              }).request(compat.gdrive.updateFile, fileId, content);
            } else { // File NOT FOUND
              new OAuth(OAuth.SERVICE_GDRIVE, function(status, body) {
                var response = (status === 200 && typeof body ===
                    "string") ?
                  util.fromJson(body) : undefined;

                if (!response) {
                  return callback();
                }

                cache[filename] = response.id;

                callback(response);
              }).request(compat.gdrive.newFile, filename, content);
            }
          }).request(compat.gdrive.list, filename);
      }
    }

    function download(filename, callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      var filename = filename,
        fileId = cache[filename];

      if (fileId) {
        new OAuth(OAuth.SERVICE_GDRIVE, function(status, body) {
          if (status === 404) { // Invalid cached id, try again
            compat.log("gdrive.download: Invalid cached id");
            delete cache[filename];
            return download(filename, callback);
          }

          var response = (status === 200 && typeof body ===
              "string") ? util
            .fromJson(body) : undefined;

          if (!response) {
            return callback(); // Unknown error
          }

          new OAuth(OAuth.SERVICE_GDRIVE, function(status, body) {
            callback((status === 200 && typeof body ===
                "string") ? body :
              undefined);
          }).request(compat.gdrive.getFile, response.downloadUrl);
        }).request(compat.gdrive.metadata, fileId);
      } else {
        new OAuth(OAuth.SERVICE_GDRIVE, function(status, body) {
          var response = (status === 200 && typeof body ===
              "string") ? util
            .fromJson(body) : undefined;

          if (!response || !util.isArray(response.items)) {
            return callback(); // Unknown error
          }

          if (response.items.length === 0) {
            return callback(null); // File NOT FOUND
          }

          cache[filename] = response.items[0].id; // Store file id

          new OAuth(OAuth.SERVICE_GDRIVE, function(status, body) {
            callback((status === 200 && typeof body ===
                "string") ? body :
              undefined);
          }).request(compat.gdrive.getFile, response.items[0].downloadUrl);
        }).request(compat.gdrive.list, filename);
      }
    }

    return {
      "upload": upload,
      "download": download
    };
  }());

  var hubic = (function() {
    function credentials(callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      new OAuth(
        OAuth.SERVICE_HUBIC,
        function(status, body) {
          if (status !== 200 || typeof body !== "string") {
            return callback();
          }

          var response = util.fromJson(body);

          if (!response) {
            return callback();
          }

          var oauth = new OAuth(OAuth.SERVICE_HUBIC);

          var serviceData = oauth.serviceData();
          serviceData.openstack_token = response.token;
          serviceData.openstack_token_expires = (typeof response.expires ===
              "string") ?
            new Date(response.expires).getTime() : -1;
          serviceData.openstack_endpoint = response.endpoint;

          oauth.serviceData(serviceData);

          callback(serviceData);
        }).request(compat.hubic.credentials);
    }

    function request() {
      var method = arguments[0];
      var params = Array.prototype.slice.call(arguments, 1);
      var callback = (params.length > 0 && typeof params[params.length -
          1] === "function") ?
        params.pop() : function() {};

      var start = function() {
        var retries = 0;
        var serviceData = new OAuth(OAuth.SERVICE_HUBIC).serviceData();

        if (!serviceData || !serviceData.openstack_token) {
          return callback();
        }

        var req = new Request(method, serviceData.openstack_token,
          function(status, body) {
            if (status === 401 && retries < 1) { // Token expired
              credentials(function(serviceData) {
                if (!serviceData) {
                  return callback();
                }

                retries++;

                req.retry(serviceData.openstack_token);
              });
            } else {
              callback(status, body);
            }
          });

        req.send.apply(req, [serviceData.openstack_endpoint].concat(
          params));
      };

      var serviceData = new OAuth(OAuth.SERVICE_HUBIC).serviceData();

      if (!serviceData) {
        return callback();
      }

      if (!serviceData.openstack_token ||
        (serviceData.openstack_token_expires !== -1 && serviceData.openstack_token_expires <
          new Date()
          .getTime())) {
        credentials(start);
      } else {
        start();
      }
    }

    function upload(filename, content, callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      request(compat.hubic.putObject, "default/agitodo/" + filename,
        content,
        function(status, body) {
          callback(status === 201 ? true : undefined);
        });
    }

    function download(filename, callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      request(compat.hubic.getObject, "default/agitodo/" + filename,
        function(status, body) {
          if (status === 200 && typeof body === "string") {
            callback(body);
          } else if (status === 404) {
            callback(null); // File NOT FOUND
          } else {
            callback();
          }
        });
    }

    return {
      "upload": upload,
      "download": download
    };
  }());

  // Upload meta & task data
  function uploadDB(callback) {
    var callback = (typeof callback === "function") ? callback : function() {};

    var exportDB = storage.exportDB(true);
    var exportMeta = "{" + util.toJson("agitodo.meta") + ":" +
      util.toJson(exportDB.meta) + "}";

    var done = function(result) {
      if (result) { // Update local metadata
        storage.meta("sync_generation", exportDB.meta.sync_generation);
        storage.meta("sync_transaction_id", exportDB.meta.sync_transaction_id);
        storage.meta("sync_hash", exportDB.meta.sync_hash);

        last.uuid = exportDB.meta.uuid;
        last.encryption_verify = exportDB.meta.encryption_verify;
        last.hash = exportDB.meta.sync_hash;
      }

      callback(result);
    };

    switch (storage.settings("storage_service")) {
      case "Dropbox":
        dropbox.upload(FILE_META, exportMeta, function(metadata) { // UPLOAD
          // agitodo.meta.json
          if (!metadata) { // Connection error
            return done();
          }

          dropbox.upload(FILE_DB, exportDB.str, function(metadata) { // UPLOAD
            // agitodo.db.json
            if (!metadata) { // Connection error
              return done();
            }

            done(metadata);
          });
        });
        break;
      case "Google Drive":
        gdrive.upload(FILE_META, exportMeta, function(metadata) { // UPLOAD
          // agitodo.meta.json
          if (!metadata) { // Connection error
            return done();
          }

          gdrive.upload(FILE_DB, exportDB.str, function(metadata) { // UPLOAD
            // agitodo.db.json
            if (!metadata) { // Connection error
              return done();
            }

            done(metadata);
          });
        });
        break;
      case "hubiC":
        hubic.upload(FILE_META, exportMeta, function(ok) { // UPLOAD
          // agitodo.meta.json
          if (!ok) { // Connection error
            return done();
          }

          hubic.upload(FILE_DB, exportDB.str, function(ok) { // UPLOAD
            // agitodo.db.json
            if (!ok) { // Connection error
              return done();
            }

            done(ok);
          });
        });
        break;
      default:
        return done();
    }
  }

  // Download database
  function downloadDB(remoteMeta, callback) {
    var callback = (typeof callback === "function") ? callback : function() {};

    var done = function(content) {
      var reply = {
        "complete": false,
        "msg": ""
      };

      if (typeof content !== "string") {
        reply.msg = "Download failed - Connection error";
        return callback(reply);
      }

      var importDB = util.fromJson(content);

      if (!util.isObject(importDB) ||
        !util.isObject(importDB["agitodo.meta"]) ||
        !util.isObject(importDB["agitodo.tasks"])) {
        compat.log("downloadDB: corrupted data");
        reply.msg = "Download failed - Corrupted database";
        return callback(reply);
      }

      var importMeta = importDB["agitodo.meta"];

      if (importMeta.uuid !== remoteMeta.uuid ||
        importMeta.sync_hash !== remoteMeta.sync_hash ||
        importMeta.encryption_verify !== remoteMeta.encryption_verify) {
        compat.log("downloadDB: corrupted metadata");
        reply.msg = "Download failed - Corrupted metadata";
        return callback(reply); // Metadata does not correspont to this db
      }

      var importTasks = importDB["agitodo.tasks"];

      var data = {}; // Prepare DB for import

      var settings = storage.settings();

      for (var i in settings) {
        data["agitodo.settings." + i] = settings[i];
      }

      var view = storage.view();

      for (var i in view) {
        data["agitodo.view." + i] = view[i];
      }

      for (var i in importMeta) {
        data["agitodo.meta." + i] = importMeta[i];
      }

      for (var i in importTasks) {
        data["agitodo.tasks." + i] = importTasks[i];
      }

      compat.deviceStorage.write(data);

      session.status("sessionLock", "loadDeviceStorage");

      last.uuid = importMeta.uuid;
      last.encryption_verify = importMeta.encryption_verify;
      last.hash = importMeta.sync_hash;

      reply.complete = true;

      callback(reply);
    };

    switch (storage.settings("storage_service")) {
      case "Dropbox":
        dropbox.download(FILE_DB, done);
        break;
      case "Google Drive":
        gdrive.download(FILE_DB, done);
        break;
      case "hubiC":
        hubic.download(FILE_DB, done);
        break;
      default:
        return done();
    }
  }

  // Extract meta from db if exists
  function extractMeta(callback) {
    var callback = (typeof callback === "function") ? callback : function() {};

    var done = function(content) {
      if (typeof content !== "string") {
        return callback();
      }

      var importDB = util.fromJson(content);

      if (!util.isObject(importDB) ||
        !util.isObject(importDB["agitodo.meta"])) {
        compat.log("extractMeta: corrupted database");
        return callback();
      }

      var exportMeta = "{" + util.toJson("agitodo.meta") + ":" +
        util.toJson(importDB["agitodo.meta"]) + "}";

      // UPLOAD agitodo.meta.json
      switch (storage.settings("storage_service")) {
        case "Dropbox":
          dropbox.upload(FILE_META, exportMeta, function(metadata) {
            callback(importDB["agitodo.meta"]);
          });
          break;
        case "Google Drive":
          gdrive.upload(FILE_META, exportMeta, function(metadata) {
            callback(importDB["agitodo.meta"]);
          });
          break;
        case "hubiC":
          hubic.upload(FILE_META, exportMeta, function(ok) {
            callback(importDB["agitodo.meta"]);
          });
          break;
        default:
          return callback(importDB["agitodo.meta"]);
      }
    };

    // DOWNLOAD agitodo.db.json
    switch (storage.settings("storage_service")) {
      case "Dropbox":
        dropbox.download(FILE_DB, done);
        break;
      case "Google Drive":
        gdrive.download(FILE_DB, done);
        break;
      case "hubiC":
        hubic.download(FILE_DB, done);
        break;
      default:
        return done();
    }
  }

  // Download meta
  function downloadMeta(callback) {
    var callback = (typeof callback === "function") ? callback : function() {};

    var done = function(content) {
      if (typeof content === "undefined") {
        compat.log("downloadMeta: connection error");
        return callback();
      }

      if (content === null) { // Try to extract meta from db
        return extractMeta(function(meta) {
          callback(meta ? meta : null);
        });
      }

      var obj = util.fromJson(content);

      callback((util.isObject(obj) && util.isObject(obj["agitodo.meta"])) ?
        obj["agitodo.meta"] : {});
    };

    // DOWNLOAD agitodo.meta.json
    switch (storage.settings("storage_service")) {
      case "Dropbox":
        dropbox.download(FILE_META, done);
        break;
      case "Google Drive":
        gdrive.download(FILE_META, done);
        break;
      case "hubiC":
        hubic.download(FILE_META, done);
        break;
      default:
        return done();
    }
  }

  function decide(remoteMeta) {
    var done = function(action, msg) {
      return {
        "action": (typeof action === "string") ? action : "",
        "msg": (typeof msg === "string") ? msg : ""
      };
    };

    if (typeof remoteMeta === "undefined") {
      compat.log("agitodo.meta: connection error");
      return done("error", "Sync: Connection error");
    }

    if (remoteMeta === null) {
      return done("upload"); // agitodo.meta.json NOT found --> UPLOAD DB
    }

    if (!util.isObject(remoteMeta) || typeof remoteMeta.uuid !== "string" ||
      typeof remoteMeta.sync_hash !== "string" ||
      typeof remoteMeta.sync_generation !== "number" ||
      typeof remoteMeta.sync_transaction_id !== "string") {
      compat.log("agitodo.meta: corrupted data");
      return done("error", "Sync: Corrupted metadata");
    }

    var localDB = storage.exportDB();
    var localMeta = localDB.meta;
    var localHash = localDB.hash;

    if (!localMeta.modified && remoteMeta.modified) {
      return done("download"); // Unmodified database --> DOWNLOAD DB
    }

    if (localMeta.uuid !== remoteMeta.uuid) {
      compat.log("agitodo.meta: different uuid");
      return done("conflict"); // Different uuid --> CONFLICT
    }

    if (localMeta.sync_generation === remoteMeta.sync_generation) {
      if (localMeta.sync_transaction_id !== remoteMeta.sync_transaction_id) {
        compat.log("agitodo.meta: different transaction_id");
        return done("conflict"); // Different transaction_id --> CONFLICT
      }

      if (localHash === remoteMeta.sync_hash &&
        localMeta.encryption_verify === remoteMeta.encryption_verify) {
        last.uuid = remoteMeta.uuid;
        last.encryption_verify = remoteMeta.encryption_verify;
        last.hash = remoteMeta.sync_hash;

        compat.log("agitodo.meta: same sync_hash & encryption_verify");
        return done(); // Same sync_hash && encryption_verify --> NO ACTION
      } else {
        return done("upload"); // default action --> UPLOAD DB
      }
    } else if (localMeta.sync_generation < remoteMeta.sync_generation) {
      return done("download"); // smaller generation --> DOWNLOAD DB
    } else if (localMeta.sync_generation > remoteMeta.sync_generation) {
      return done("upload"); // larger generation --> UPLOAD DB
    }

    return done(); // default --> NO ACTION
  }

  function start(forceKeep, callback) {
    var forceKeep = forceKeep ? forceKeep : null;
    var callback = callback ? callback : null;

    session.loader("Synchronizing...");

    function closeLoader(msg) {
      if (callback) {
        if (session.status("sessionLock") === "loader") {
          session.unlock();
        }

        if (!msg) {
          widget.loader();
          callback();
        } else {
          widget.loader(msg, true, compat.C("MSG_DELAY"));
          window.setTimeout(callback, compat.C("MSG_DELAY"));
        }
      } else {
        if (!msg) {
          session.loader();
        } else {
          session.loader(msg, true, compat.C("MSG_DELAY"));
        }
      }
    }

    function uploadComplete(result) {
      if (result) {
        compat.log(result);
        closeLoader();
      } else {
        closeLoader("Sync: Upload failed - Connection error");
      }
    }

    function downloadComplete(result) {
      if (result.complete) {
        compat.log("Download complete");
        closeLoader();
      } else {
        closeLoader("Sync: " + result.msg);
      }
    }

    function dbConflict(remoteMeta) {
      if (forceKeep) {
        if (forceKeep === "local") {
          compat.log("Sync: Database conflict - force upload");
          uploadDB(uploadComplete);
        } else {
          compat.log("Sync: Database conflict - force download");
          downloadDB(remoteMeta, downloadComplete);
        }
      } else {
        compat.log("Sync: Database conflict");
        session.status("sessionLock", "message");
        session
          .status(
            "sessionLockData", {
              html: "<h2>Sync: Database conflict!</h2><p>Select which database to keep...</p>",
              options: [
                ["Local", function() {
                  session.unlock();
                  start("local", callback);
                }],
                ["Remote", function() {
                  session.unlock();
                  start("remote", callback);
                }]
              ]
            });

        session.refresh();
      }
    }

    downloadMeta(function(remoteMeta) { // DOWNLOAD agitodo.meta.json
      var result = decide(remoteMeta);

      switch (result.action) {
        case "download":
          downloadDB(remoteMeta, downloadComplete);
          break;
        case "upload":
          uploadDB(uploadComplete);
          break;
        case "conflict":
          dbConflict(remoteMeta);
          break;
        case "error":
          closeLoader(result.msg);
          break;
        default:
          return closeLoader();
      }
    });
  }

  return {
    "start": start,
    "last": last
  };
}());
