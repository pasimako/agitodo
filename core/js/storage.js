var storage = (function() {
  var PREFIX_TASK = "agitodo.tasks.";
  var PREFIX_META = "agitodo.meta.";
  var PREFIX_SETTINGS = "agitodo.settings.";
  var PREFIX_VIEW = "agitodo.view.";

  var taskIDs = [];

  // Prototype: Task
  function Task(data) {
    var data = util.isObject(data) ? data : {};

    this.id = (typeof data.id === "string") ? data.id : "";
    this.created = (typeof data.created === "number") ? data.created :
      new Date().getTime();
    this.title = (typeof data.title === "string") ? data.title : "?";
    this.scheduled = (typeof data.scheduled === "boolean") ? data.scheduled :
      false;
    this.category = (typeof data.category === "string") ? data.category :
      "";
    this.start = (typeof data.start === "number") ? data.start : new XDate()
      .clearTime().getTime();
    this.end = (typeof data.end === "number") ? data.end : this.start;
    this.time = (typeof data.time === "string") ? data.time : "";
    this.days = (typeof data.days === "object") ? data.days : [];
    this.notes = (typeof data.notes === "string") ? data.notes : "";
    this.history = (typeof data.history === "object") ? data.history : [];
  }

  // Prototype: Task, Method: toString, Sort keys and convert to Json string
  Task.prototype.toString = function() {
    var keys = [];

    for (var i in this) {
      if (!this.hasOwnProperty(i) || typeof this[i] === "function") {
        continue;
      }
      keys.push(i);
    }

    keys.sort();

    var str = "";

    for (var i = 0; i < keys.length; i++) {
      str += (str ? "," : "") + util.toJson(keys[i]) + ":" +
        util.toJson(this[keys[i]]);
    }

    return "{" + str + "}";
  };

  // Prototype: Meta
  function Meta(data) {
    var data = util.isObject(data) ? data : {};

    this.version = compat.C("APP_VERSION");
    this.uuid = (typeof data.uuid === "string") ? data.uuid : util.uuid();
    this.encryption_salt = (typeof data.encryption_salt === "string") ?
      data.encryption_salt : "";
    this.encryption_verify = (typeof data.encryption_verify === "string") ?
      data.encryption_verify : "";
    this.modified = (typeof data.modified === "number") ? data.modified : 0;

    this.sync_generation = (typeof data.sync_generation === "number") ?
      data.sync_generation : 0;
    this.sync_transaction_id = (typeof data.sync_transaction_id ===
        "string") ?
      data.sync_transaction_id : "";
    this.sync_hash = (typeof data.sync_hash === "string") ? data.sync_hash :
      "";
  }

  // Prototype: Settings
  function Settings(data) {
    var data = util.isObject(data) ? data : {};

    this.encryption_hash = (typeof data.encryption_hash === "string") ?
      data.encryption_hash : "";

    this.storage_service = (typeof data.storage_service === "string") ?
      data.storage_service : "";
    this.storage_dropbox = util.isObject(data.storage_dropbox) ?
      new OAuth.Dropbox(data.storage_dropbox) : null;
    this.storage_gdrive = util.isObject(data.storage_gdrive) ?
      new OAuth.Google(data.storage_gdrive) : null;
    this.storage_hubic = util.isObject(data.storage_hubic) ? new OAuth.Hubic(
      data.storage_hubic) : null;
    this.sync_period = (typeof data.sync_period === "string") ?
      data.sync_period : "Manual";

    this.email_service = (typeof data.email_service === "string") ?
      data.email_service : "";
    this.email_gmail = util.isObject(data.email_gmail) ? new OAuth.Google(
      data.email_gmail) : null;
    this.email_default = (typeof data.email_default === "string") ?
      data.email_default : "";

    this.timeFormat = (typeof data.timeFormat === "string") ? data.timeFormat :
      "12h";
    this.dateFormat = (typeof data.dateFormat === "string") ? data.dateFormat :
      "DMY";
    this.weekStarts = (typeof data.weekStarts === "string") ? data.weekStarts :
      "Mon";
  }

  // Prototype: View
  function View(data) {
    var data = util.isObject(data) ? data : {};

    this.last_page = (typeof data.last_page === "string") ? data.last_page :
      "pg_month";
    this.taskList_view = (typeof data.taskList_view === "string") ?
      data.taskList_view : "Title";
  }

  function splitPrefix(data) {
    var data = util.isObject(data) ? data : {};

    var settings = {};
    var view = {};
    var meta = {};
    var task = {};

    for (var key in data) {
      if (util.startsWith(key, PREFIX_SETTINGS)) {
        settings[key.slice(PREFIX_SETTINGS.length)] = data[key];
      } else if (util.startsWith(key, PREFIX_VIEW)) {
        view[key.slice(PREFIX_VIEW.length)] = data[key];
      } else if (util.startsWith(key, PREFIX_META)) {
        meta[key.slice(PREFIX_META.length)] = data[key];
      } else if (util.startsWith(key, PREFIX_TASK)) {
        task[key.slice(PREFIX_TASK.length)] = data[key];
      }
    }

    return {
      "settings": settings,
      "view": view,
      "meta": meta,
      "task": task
    };
  }

  var cache = (function() {
    var items = {};
    var encryptionKey = ""; // Hex
    var encryptionSalt = ""; // Hex
    var encryptionHash = ""; // Hex

    // Decrypt string
    function decrypt(text) {
      if (!encryptionKey || typeof text !== "string") {
        return text;
      }

      try {
        return util.fromJson(CryptoJS.AES.decrypt(text,
          CryptoJS.enc.Hex.parse(encryptionKey), {
            iv: CryptoJS.enc.Hex.parse(encryptionSalt)
          }).toString(CryptoJS.enc.Utf8));
      } catch (e) {
        return;
      }
    }

    // Encrypt object
    function encrypt(data) {
      if (!encryptionKey) {
        return data;
      }

      var text = util.toJson(data);

      if (!text) {
        return;
      }

      try {
        return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(text),
          CryptoJS.enc.Hex.parse(encryptionKey), {
            iv: CryptoJS.enc.Hex.parse(encryptionSalt)
          }).toString();
      } catch (e) {
        return;
      }
    }

    function createEncryptionKey(hash, uuid, salt) {
      if (!hash || typeof hash !== "string" || !uuid ||
        typeof uuid !== "string") {
        return;
      }

      var key;
      var salt = (typeof salt === "string") ? salt : CryptoJS.lib.WordArray
        .random(128 / 8).toString();
      var verify;

      try {
        key = CryptoJS.PBKDF2(hash, salt, {
          hasher: CryptoJS.algo.SHA256,
          keySize: 256 / 32
        }).toString();

        verify = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(uuid),
          CryptoJS.enc.Hex.parse(key), {
            iv: CryptoJS.enc.Hex.parse(salt)
          }).toString();
      } catch (e) {
        return;
      }

      return {
        "key": key,
        "salt": salt,
        "verify": verify
      };
    }

    // Verify password
    function verifyPassword(password, uuid, salt, verify) {
      if (typeof uuid !== "string" || typeof salt !== "string" ||
        typeof verify !== "string") {
        return;
      }

      if (salt || verify) {
        if (typeof password !== "string" || !uuid || !salt || !verify) {
          return;
        }

        var hash;

        try {
          hash = CryptoJS.SHA256(password).toString();
        } catch (e) {
          return;
        }

        var encryptionData = createEncryptionKey(hash, uuid, salt);

        if (!encryptionData || encryptionData.verify !== verify) {
          return;
        }

        return {
          "hash": hash,
          "key": encryptionData.key,
          "salt": encryptionData.salt,
          "verify": encryptionData.verify
        };
      } else {
        return (typeof password !== "string") ? {
          "hash": "",
          "key": "",
          "salt": "",
          "verify": ""
        } : undefined;
      }
    }

    function setEncryptionKey(key, salt, hash) {
      encryptionKey = (typeof key === "string") ? key : "";
      encryptionSalt = (typeof salt === "string") ? salt : "";
      encryptionHash = (typeof hash === "string") ? hash : "";
    }

    function setEncryptionHash(hash, uuid) {
      var key = "";
      var hash = (typeof hash === "string") ? hash : "";
      var salt = "";
      var verify = "";

      if (hash) {
        var encryptionData = createEncryptionKey(hash, uuid);

        if (!encryptionData) {
          return;
        }

        key = encryptionData.key;
        salt = encryptionData.salt;
        verify = encryptionData.verify;
      }

      setEncryptionKey(key, salt, hash);

      return {
        "salt": salt,
        "verify": verify
      };
    }

    function setPassword(password, uuid) {
      var hash = "";

      if (password && typeof password === "string") {
        try {
          hash = CryptoJS.SHA256(password).toString();
        } catch (e) {
          return;
        }
      }

      return setEncryptionHash(hash, uuid);
    }

    function getItem(key) {
      return (key in items) ? items[key] : undefined;
    }

    function setItem(key, value) {
      items[key] = value;
      compat.deviceStorage.setItem(key, util.startsWith(key,
          PREFIX_TASK) ?
        encrypt(value) : value);
    }

    function removeItem(key) {
      delete items[key];
      compat.deviceStorage.removeItem(key);
    }

    function clear() {
      items = {};
    }

    // Write cache into deviceStorage
    function persist() {
      for (var key in items) {
        setItem(key, items[key]);
      }
    }

    // Write raw data into cache/deviceStorage
    function write(data, password) {
      var data = util.isObject(data) ? compat.convertDB(data) : {};

      var uuid = (typeof data[PREFIX_META + "uuid"] === "string") ?
        data[PREFIX_META + "uuid"] : "";
      var salt = (typeof data[PREFIX_META + "encryption_salt"] ===
          "string") ?
        data[PREFIX_META + "encryption_salt"] : "";
      var verify = (typeof data[PREFIX_META + "encryption_verify"] ===
          "string") ?
        data[PREFIX_META + "encryption_verify"] : "";

      var key = "";
      var hash = "";

      if (typeof password === "string") {
        var encryptionData = verifyPassword(password, uuid, salt,
          verify);

        if (!encryptionData) {
          return;
        }

        key = encryptionData.key;
        hash = encryptionData.hash;
      } else {
        if (salt || verify) {
          hash = encryptionHash ? encryptionHash : settings(
            "encryption_hash");

          var encryptionData = createEncryptionKey(hash, uuid, salt);

          if (!encryptionData || encryptionData.verify !== verify) {
            return;
          }

          key = encryptionData.key;
        }
      }

      setEncryptionKey(key, salt, hash);

      taskIDs = [];
      items = {};
      compat.deviceStorage.clear();

      var prefix = splitPrefix(data);

      var newSettings = new Settings(prefix.settings);

      for (var i in newSettings) {
        setItem(PREFIX_SETTINGS + i, newSettings[i]);
      }

      var newView = new View(prefix.view);

      for (var i in newView) {
        setItem(PREFIX_VIEW + i, newView[i]);
      }

      for (var i in prefix.task) {
        tasks.add(decrypt(prefix.task[i]));
      }

      var newMeta = new Meta(prefix.meta);

      for (var i in newMeta) {
        setItem(PREFIX_META + i, newMeta[i]);
      }

      session.status("storageModified", new Date().getTime());

      return true;
    }

    // Load deviceStorage into cache
    function reload(password) {
      var data = {};
      var keys = compat.deviceStorage.keys();

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var str = compat.deviceStorage.getItem(key);

        if (typeof str === "undefined") {
          continue;
        }

        data[key] = str;
      }

      return write(data, password);
    }

    return {
      "persist": persist,
      "write": write,
      "reload": reload,
      "getItem": getItem,
      "setItem": setItem,
      "removeItem": removeItem,
      "createEncryptionKey": createEncryptionKey,
      "setEncryptionHash": setEncryptionHash,
      "setPassword": setPassword,
      "verifyPassword": verifyPassword,
      "decrypt": decrypt,
      "encrypt": encrypt,
      "getEncryptionHash": function() {
        return encryptionHash;
      }
    };
  }());

  // Get/Set settings items
  function settings(key, value) {
    if (typeof key === "undefined") {
      var data = new Settings();

      for (var i in data) {
        var val = cache.getItem(PREFIX_SETTINGS + i);

        if (typeof val === "undefined") {
          delete data[i];
        } else {
          data[i] = val;
        }
      }

      return data;
    }

    if (typeof value !== "undefined") {
      cache.setItem(PREFIX_SETTINGS + key, value);

      session.status("storageModified", new Date().getTime());
    }

    return cache.getItem(PREFIX_SETTINGS + key);
  }

  // Get/Set view items
  function view(key, value) {
    if (typeof key === "undefined") {
      var data = new View();

      for (var i in data) {
        var val = cache.getItem(PREFIX_VIEW + i);

        if (typeof val === "undefined") {
          delete data[i];
        } else {
          data[i] = val;
        }
      }

      return data;
    }

    if (typeof value !== "undefined") {
      cache.setItem(PREFIX_VIEW + key, value);
    }

    return cache.getItem(PREFIX_VIEW + key);
  }

  // Get/Set meta items
  function meta(key, value) {
    if (typeof key === "undefined") {
      var data = new Meta();

      for (var i in data) {
        var val = cache.getItem(PREFIX_META + i);

        if (typeof val === "undefined") {
          delete data[i];
        } else {
          data[i] = val;
        }
      }

      return data;
    }

    if (typeof value !== "undefined") {
      cache.setItem(PREFIX_META + key, value);
    }

    return cache.getItem(PREFIX_META + key);
  }

  // Get/Set task items
  function task(key, value) {
    if (typeof key === "undefined") {
      var data = {};

      for (var i = 0; i < taskIDs.length; i++) {
        data[taskIDs[i]] = cache.getItem(PREFIX_TASK + taskIDs[i]);
        if (!data[taskIDs[i]]) {
          delete data[taskIDs[i]];
        }
      }

      return data;
    }

    if (util.isObject(value)) {
      // Merge default values with new
      cache.setItem(PREFIX_TASK + key, new Task(value));

      if (!util.contains(taskIDs, key)) {
        taskIDs.push(key);
      }

      meta("modified", new Date().getTime());
      session.status("storageModified", new Date().getTime());
    }

    return cache.getItem(PREFIX_TASK + key);
  }

  // Remove task items
  function removeTask(id) {
    if (typeof id === "string") {
      if (util.contains(taskIDs, id)) {
        taskIDs.splice(taskIDs.indexOf(id), 1);
      }

      cache.removeItem(PREFIX_TASK + id);
    } else {
      for (var i = 0; i < taskIDs.length; i++) {
        cache.removeItem(PREFIX_TASK + taskIDs[i]);
      }

      taskIDs = [];
    }

    meta("modified", new Date().getTime());
    session.status("storageModified", new Date().getTime());
  }

  function replaceSettings(data) {
    var newSettings = new Settings(data);

    for (var i in newSettings) {
      settings(i, newSettings[i]);
    }
  }

  function replaceView(data) {
    var newView = new View(data);

    for (var i in newView) {
      view(i, newView[i]);
    }
  }

  function replaceMeta(data) {
    var newMeta = new Meta(data);

    for (var i in newMeta) {
      meta(i, newMeta[i]);
    }
  }

  function replaceTasks(data) {
    removeTask();

    if (!util.isObject(data)) {
      return;
    }

    for (var i in data) {
      tasks.add(cache.decrypt(data[i]));
    }
  }

  // Export DB: tasks are encrypted and alphabetically sorted
  function exportDB(newTransaction) {
    var str = "";

    var objTasks = task();
    var ids = Object.keys(objTasks);
    ids.sort();

    for (var i = 0; i < ids.length; i++) {
      var obj = objTasks[ids[i]];
      if (!obj) {
        continue;
      }

      str += (str ? "," : "") + util.toJson(ids[i]) + ":" +
        util.toJson(cache.encrypt(obj));
    }

    str = "{" + str + "}";

    var hash = util.hash(str);

    var objMeta = meta();

    if (newTransaction) {
      objMeta.sync_generation++;
      objMeta.sync_transaction_id = util.randomString(6);
      objMeta.sync_hash = hash;
    }

    str = "{" + util.toJson("agitodo.meta") + ":" + util.toJson(objMeta) +
      "," + util.toJson("agitodo.tasks") + ":" + str + "}";

    return {
      "meta": objMeta,
      "tasks": objTasks,
      "str": str,
      "hash": hash
    };
  }

  function storeEncryptionHash() {
    settings("encryption_hash", cache.getEncryptionHash());
  }

  function loadEncryptionHash() {
    var hash = settings("encryption_hash");

    if (!hash) {
      return;
    }

    var encryptionData = cache.setEncryptionHash(hash, meta("uuid"));

    if (!encryptionData) {
      return;
    }

    meta("encryption_salt", encryptionData.salt);
    meta("encryption_verify", encryptionData.verify);

    cache.persist();

    return true;
  }

  // Reset encryptionKey using new password
  function changePassword(password) {
    var encryptionData = cache.setPassword(password, meta("uuid"));

    if (!encryptionData) {
      return;
    }

    meta("encryption_salt", encryptionData.salt);
    meta("encryption_verify", encryptionData.verify);

    cache.persist();

    return true;
  }

  return {
    "write": cache.write,
    "reload": cache.reload,
    "verifyPassword": cache.verifyPassword,
    "meta": meta,
    "task": task,
    "settings": settings,
    "view": view,
    "removeTask": removeTask,
    "getTaskIDs": function() {
      return taskIDs;
    },
    "exportDB": exportDB,
    "changePassword": changePassword,
    "storeEncryptionHash": storeEncryptionHash,
    "loadEncryptionHash": loadEncryptionHash,
    "replaceMeta": replaceMeta,
    "replaceSettings": replaceSettings,
    "replaceTasks": replaceTasks
  };
}());
