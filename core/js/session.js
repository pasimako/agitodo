var session = (function() {
  var PAGE_NAME = "session";
  var DEFAULT_PAGE = "pg_month";
  var VALID_PAGES = ["session", "pg_day", "pg_week", "pg_month",
    "pg_taskList", "dg_edit", "dg_settings", "dg_about"
  ];
  var INIT = ["init_start", "init_loadDeviceStorage",
    "init_checkEncryption",
    "init_checkSync"
  ];

  var page = null;

  var popupGetPassword = null;
  var popupSetPassword = null;
  var onDone = null;
  var currentView = "";
  var statusFlags = {
    "sessionLock": INIT[0],
    "sessionLockData": null,
    "prevPage": "",
    "currentPage": "",
    "storageModified": 0,
    "navigate": false
  };
  var run_init = [];

  function status(key, value) {
    if (typeof value !== "undefined") {
      statusFlags[key] = value;
    }
    return statusFlags[key];
  }

  function unlock() {
    status("sessionLock", "");
    status("sessionLockData", null);
  }

  function navigate(toPage, force) {
    var toPage = (toPage && typeof toPage === "string") ? toPage : storage
      .view("last_page");
    if (!util.contains(VALID_PAGES, toPage)) {
      toPage = DEFAULT_PAGE;
    }

    if (!window[toPage]) {
      return;
    }

    widget.loader(); // Close loader
    widget.activePopup.close(); // Close active popup

    status("prevPage", status("currentPage"));
    status("currentPage", toPage);

    if (toPage !== "session" && !util.startsWith(toPage, "dg_")) {
      storage.view("last_page", toPage);
    }

    if (!util.contains(run_init, toPage) &&
      window[toPage].hasOwnProperty("_init")) {
      // compat.log(toPage + "._init()");
      window[toPage]._init();
      run_init.push(toPage);
    }

    if (window[toPage].hasOwnProperty("_show")) {
      // compat.log(toPage + "._show()");
      window[toPage]._show();
    }

    var hide = function() {
      $("#" + status("prevPage")).hide().removeClass("ui-page-active");

      if (window[status("prevPage")].hasOwnProperty("_hide")) {
        // compat.log(status("prevPage") + "._hide()");
        window[status("prevPage")]._hide();
      }
    };

    var show = function() {
      $("#" + toPage).show().addClass("ui-page-active");

      if (window[toPage].hasOwnProperty("_done")) {
        // compat.log(toPage + "._done()");
        window[toPage]._done();
      }
    };

    if (status("prevPage") && toPage !== status("prevPage")) {
      if (compat.C("TRANSITION_PAGE") && status("prevPage") !== "session") {
        $("#" + status("prevPage")).fadeOut(150, function() {
          hide();
          $("#" + toPage).fadeIn(150, show);
        });
      } else {
        hide();
        show();
      }
    } else {
      if (compat.C("TRANSITION_PAGE") && toPage !== "session") {
        $("#" + toPage).fadeIn(150, show);
      } else {
        show();
      }
    }
  }

  function viewMessage(html, options) {
    page.setTitle(compat.C("APP_NAME"));

    page.empty();

    var div = document.createElement("div");
    div.innerHTML = html;

    page.append(div);

    if (util.isArray(options)) {
      for (var i = 0; i < options.length; i++) {
        page.append(widget.button(options[i][0],
          "ui-btn ui-corner-all ui-shadow ui-btn-a" +
          ((options.length > 1) ? " ui-btn-inline" : ""), null,
          options[i][1]));
      }
    }

    currentView = "message";
  }

  function viewDefault() {
    if (currentView === "default") {
      return;
    }

    page.setTitle(compat.C("APP_NAME"));
    page.empty();

    var el = document.createElement("img");
    page.append(el);

    el.src = compat.C("IMG_SRC") + "icon-256.png";
    el.style.display = "block";
    el.style.margin = "0 auto";
    el.style.width = "160px";
    el.style.height = "160px";

    page
      .append($(
        "<h3 style='margin:1em auto 0.5em auto;text-align:center;'>" +
        compat.C("APP_NAME") +
        "</h3><h4 style='margin:0.5em auto 1em auto;text-align:center;'>" +
        compat.C("APP_VERSION") +
        "</h4><p style='margin:0 auto;text-align:center;'>Copyright &copy; 2013</p>"
      ));

    currentView = "default";
  }

  function loader(msg, textonly, timeout) {
    if (msg) {
      var msg = msg,
        textonly = textonly,
        timeout = timeout;

      var show = function() {
        widget.loader(msg, textonly);

        if (timeout) {
          window.setTimeout(function() {
            loader();
          }, timeout);
        }
      };

      status("sessionLock", "loader");

      if (status("currentPage") === PAGE_NAME) {
        viewDefault();
        show();
      } else {
        onDone = show;
        navigate("session", true);
      }
    } else {
      if (status("sessionLock") === "loader") {
        status("sessionLock", "");
      }
      widget.loader();
      if (status("currentPage") === PAGE_NAME) {
        navigate("session", true);
      }
    }
  }

  function loadDeviceStorage(password) {
    viewDefault();

    var ok = storage.reload(password);

    if (ok) {
      compat.log("Loaded DB from deviceStorage. Version = " +
        storage.meta("version") + ", Size = " + compat.deviceStorage.size()
      );
    }

    return ok;
  }

  function checkEncryption() {
    var salt = compat.deviceStorage
      .getItem("agitodo.meta.encryption_salt");
    var verify = compat.deviceStorage
      .getItem("agitodo.meta.encryption_verify");

    return (salt && verify);
  }

  function setPassword(callback) {
    var callback = callback ? callback : null;

    if (storage.loadEncryptionHash()) {
      compat.log("Using stored encryption hash...");

      return callback ? callback() : undefined;
    }

    compat.log("Undefined encryption key...");

    popupSetPassword.onOk = function(password) {
      if (!password) {
        popupGetPassword.message("Invalid password!");
        popupGetPassword.refresh();
      } else {
        popupSetPassword.close();

        storage.changePassword(password);

        return callback ? callback() : undefined;
      }
    };

    popupSetPassword.show(page.container);
  }

  function getPassword(callback) {
    var callback = callback ? callback : null;

    compat.log("Encryption key invalid...");

    popupGetPassword.onOk = function(password) {
      var uuid = compat.deviceStorage.getItem("agitodo.meta.uuid");
      var salt = compat.deviceStorage
        .getItem("agitodo.meta.encryption_salt");
      var verify = compat.deviceStorage
        .getItem("agitodo.meta.encryption_verify");

      if (!password || !storage.verifyPassword(password, uuid, salt,
          verify)) {
        popupGetPassword.message("Invalid password!");
        popupGetPassword.refresh();
      } else {
        popupGetPassword.close();

        loadDeviceStorage(password);

        if (popupGetPassword.checkRemember) {
          if (popupGetPassword.checkRemember.checked.length) {
            storage.storeEncryptionHash();
          } else {
            storage.settings("encryption_hash", "");
          }
        }

        return callback ? callback() : undefined;
      }
    };

    if (popupGetPassword.checkRemember) {
      popupGetPassword.checkRemember.reset();

      if (storage.settings("encryption_hash")) {
        popupGetPassword.checkRemember.setOption("Remember password");
      }
    }

    popupGetPassword.show(page.container);
  }

  function checkSync(callback) {
    var callback = callback ? callback : null;

    if (storage.settings("storage_service") &&
      storage.settings("sync_period") === "Auto") {
      sync.start(null, callback);
    } else {
      callback();
    }
  }

  function _hide() {
    popupGetPassword.close();
    popupSetPassword.close();
  }

  function _done() {
    if (onDone) {
      var exec = onDone;
      onDone = null;
      exec();
      return;
    }

    var next = function(lock) {
      status("sessionLock", (typeof lock === "string") ? lock : "");
      navigate("session", true);
    };

    var nextInit = function() {
      var next = INIT.indexOf(status("sessionLock")) + 1;

      if (next > 0) {
        status("sessionLock", (next >= INIT.length) ? "" : INIT[next]);
      }

      navigate("session", true);
    };

    switch (status("sessionLock")) {
      case "init_start":
        compat.init(nextInit);
        break;
      case "init_loadDeviceStorage":
        if (loadDeviceStorage()) {
          nextInit();
        } else {
          getPassword(nextInit);
        }
        break;
      case "init_checkEncryption":
        if (checkEncryption()) {
          nextInit();
        } else {
          setPassword(nextInit);
        }
        break;
      case "init_checkSync":
        checkSync(nextInit);
        break;
      case "loadDeviceStorage":
        if (loadDeviceStorage()) {
          next("checkEncryption");
        } else {
          getPassword(next);
        }
        break;
      case "checkEncryption":
        if (checkEncryption()) {
          next();
        } else {
          setPassword(next);
        }
        break;
      case "loader":
        break;
      case "message":
        break;
      default:
        navigate();
    }
  }

  function _show() {
    switch (status("sessionLock")) {
      case "message":
        viewMessage(status("sessionLockData").html,
          status("sessionLockData").options);
        break;
      default:
        viewDefault();
    }
  }

  function _init() {
    page = new widget.Dialog("session", compat.C("APP_NAME"), false,
      document.body);

    // Set password popup
    popupSetPassword = new widget.PopupPassword(page.element,
      "New password",
      true);

    popupSetPassword.onCancel = function() {
      popupSetPassword.close();
      compat.exit(true);
    };

    // Get password popup
    popupGetPassword = new widget.PopupPassword(page.element,
      "Enter password",
      false);

    popupGetPassword.onCancel = function() {
      popupGetPassword.close();
      compat.exit(true);
    };
  }

  return {
    "_init": _init,
    "_show": _show,
    "_done": _done,
    "_hide": _hide,
    "status": status,
    "unlock": unlock,
    "navigate": navigate,
    "reload": function() {
      window.location.reload(true);
    },
    "refresh": function() {
      navigate("session", true);
    },
    "back": function() {
      navigate(status("prevPage"));
    },
    "loader": loader
  };
}());
