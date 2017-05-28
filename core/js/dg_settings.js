var dg_settings = (function() {
  var page = null;

  var selectStorageService = null;
  var checkAutoSync = null;
  var selectEmailService = null;
  var inputDefaultEmail = null;
  var radioTimeFormat = null;
  var radioDateFormat = null;
  var radioWeekStarts = null;
  var checkRememberPassword = null;
  var dropboxCodePopup = null;
  var gdriveCodePopup = null;
  var hubicCodePopup = null;
  var gmailCodePopup = null;

  var popupEmpty = null;

  var cache = {
    meta: null,
    settings: null,
    password: null
  };

  var skipEncryptionPopup = false;
  var storageServiceChanged = false;

  function PopupOAuthCode(service, parent) {
    widget.Popup.call(this, parent, false, true);

    this.service = service;
    this.isStorageService = (service !== OAuth.SERVICE_GMAIL);

    var self = this;

    this.style({
      "minWidth": "15em",
      "padding": "0.5em 1em"
    });

    var h3 = document.createElement("h3");
    h3.textContent = OAuth.SERVICE_NAME[this.service];
    h3.style.textAlign = "center";
    this.append(h3);

    var div;

    div = document.createElement("div");
    div.style.margin = "1em auto";

    var btnAuth = widget.button("Authorize application",
      "ui-btn ui-btn-a ui-corner-all ui-shadow ui-btn-icon-left ui-icon-lock",
      null,
      function() {
        self.authorize();
      });

    div.appendChild(btnAuth);

    this.append(div);

    div = document.createElement("div");
    div.style.margin = "1em auto";
    div.style.textAlign = "center";
    div.textContent = "OR";
    this.append(div);

    this.inputText = new widget.InputText(true);
    this.inputText.input.type = "text";
    this.inputText.input.placeholder = "Enter authorization code";
    this.inputText.onEnterHandler = function() {
      self.onOk();
    };

    this.append(this.inputText.element);

    var btnOk = widget
      .button(
        "Ok",
        "ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-a ui-btn-icon-left ui-icon-check",
        null,
        function() {
          self.onOk();
        });

    this.append(btnOk);

    var btnCancel = widget
      .button(
        "Cancel",
        "ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-a ui-btn-icon-left ui-icon-delete",
        null,
        function() {
          self.onCancel();
        });

    this.append(btnCancel);

    var onKeydown = function(event) {
      self.onKeydown(event);
    };

    this.afterOpen = function() {
      $(document).on("keydown", onKeydown);
      self.refresh();
    };

    this.afterClose = function() {
      $(document).off("keydown", onKeydown);
    };
  }

  PopupOAuthCode.prototype = Object.create(widget.Popup.prototype);

  PopupOAuthCode.prototype.constructor = PopupOAuthCode;

  PopupOAuthCode.prototype.authorize = function() {
    if (!compat.oauth.url(this.service)) {
      return widget.loader("Cannot open authorization URL!", true, compat
        .C("MSG_DELAY"));
    }

    widget.loader("Waiting for authorization code...");

    var self = this;

    compat.oauth.code(function(code) {
      if (!code) {
        return widget.loader("Authorization error!", true, compat
          .C("MSG_DELAY"));
      }

      self.code(code);

      self.onOk();
    });
  };

  PopupOAuthCode.prototype.onKeydown = function(event) {
    var code = event.keyCode || event.which;

    if (code == 27) { // "Esc" keycode
      event.stopPropagation();
      event.preventDefault();
      this.onCancel();
    }
  };

  PopupOAuthCode.prototype.onOk = function() {
    widget.loader();
    compat.oauth.stop(); // Force stop oauth code polls

    if (!this.code()) {
      widget.loader("Undefined code!", true, compat.C("MSG_DELAY"));
      this.restoreService()
      return this.close();
    }

    widget
      .loader("Acquiring " + OAuth.SERVICE_NAME[this.service] +
        " Token...");

    if (this.isStorageService) {
      selectStorageService.disabled(true);
    } else {
      selectEmailService.disabled(true);
    }

    var self = this;

    new OAuth(this.service, function(data) {
      if (self.isStorageService) {
        selectStorageService.disabled(false);
      } else {
        selectEmailService.disabled(false);
      }

      if (data) {
        widget.loader();

        if (self.isStorageService) {
          setStorageService(self.service, data);
        } else {
          setEmailService(self.service, data);
        }
      } else {
        widget.loader("Authorization error!", true, compat.C(
          "MSG_DELAY"));
        self.restoreService();
      }

      self.close();
    }).token(this.code());
  };

  PopupOAuthCode.prototype.onCancel = function() {
    widget.loader();
    compat.oauth.stop(); // Force stop oauth code polls
    this.restoreService();
    this.close();
  };

  PopupOAuthCode.prototype.restoreService = function() {
    var serviceName = this.isStorageService ? cache.settings[
        "storage_service"] :
      cache.settings["email_service"];

    var serviceID = (serviceName in OAuth.SERVICE_ID) ?
      OAuth.SERVICE_ID[serviceName] : -1;

    if (this.isStorageService) {
      setStorageService(serviceID);
    } else {
      setEmailService(serviceID);
    }
  };

  PopupOAuthCode.prototype.code = function(text) {
    if (typeof text !== "undefined") {
      this.inputText.val(text);
    }

    return this.inputText.val();
  };

  PopupOAuthCode.prototype.refresh = function() {
    this.inputText.val("");
    this.inputText.focus();
  };

  function setStorageService(service, data) {
    switch (service) {
      case OAuth.SERVICE_DROPBOX:
      case OAuth.SERVICE_GDRIVE:
      case OAuth.SERVICE_HUBIC:
        selectStorageService.select(OAuth.SERVICE_NAME[service]);
        checkAutoSync.disabled(false);
        break;
      default:
        cache.settings["storage_service"] = "";
        cache.settings["storage_dropbox"] = null;
        cache.settings["storage_gdrive"] = null;
        cache.settings["storage_hubic"] = null;

        selectStorageService.select("Local only");
        checkAutoSync.disabled(true);
        return;
    }

    if (data) {
      cache.settings["storage_dropbox"] = null;
      cache.settings["storage_gdrive"] = null;
      cache.settings["storage_hubic"] = null;

      storageServiceChanged = true;

      switch (service) {
        case OAuth.SERVICE_DROPBOX:
          cache.settings["storage_service"] = OAuth.SERVICE_NAME[service];
          cache.settings["storage_dropbox"] = new OAuth.Dropbox(data);
          break;
        case OAuth.SERVICE_GDRIVE:
          cache.settings["storage_service"] = OAuth.SERVICE_NAME[service];
          cache.settings["storage_gdrive"] = new OAuth.Google(data);
          break;
        case OAuth.SERVICE_HUBIC:
          cache.settings["storage_service"] = OAuth.SERVICE_NAME[service];
          cache.settings["storage_hubic"] = new OAuth.Hubic(data);
          break;
      }
    }
  }

  function setEmailService(service, data) {
    switch (service) {
      case OAuth.SERVICE_GMAIL:
        selectEmailService.select(OAuth.SERVICE_NAME[service]);
        inputDefaultEmail.disabled(false);
        break;
      default:
        cache.settings["email_service"] = "";
        cache.settings["email_gmail"] = null;

        selectEmailService.select("Disabled");
        inputDefaultEmail.disabled(true);
        return;
    }

    if (data) {
      cache.settings["email_gmail"] = null;

      switch (service) {
        case OAuth.SERVICE_GMAIL:
          cache.settings["email_service"] = OAuth.SERVICE_NAME[service];
          cache.settings["email_gmail"] = new OAuth.Google(data);
          break;
      }
    }
  }

  function save() {
    storage.replaceSettings(cache.settings);

    storage.settings("sync_period", checkAutoSync.checked.length ? "Auto" :
      "Manual");
    storage.settings("email_default", inputDefaultEmail.val());

    storage.replaceMeta(cache.meta);

    if (cache.password) {
      storage.changePassword(cache.password);
    }

    if (checkRememberPassword.checked.length) {
      storage.storeEncryptionHash();
    } else {
      storage.settings("encryption_hash", "");
    }

    if (storageServiceChanged) {
      sync.last.uuid = "";
      sync.last.encryption_verify = "";
      sync.last.hash = "";
    }
  }

  function _hide() {
    compat.oauth.stop(); // Force stop oauth code polls
  }

  function _done() {
    $(page.element).focus();
  }

  function _show() {
    cache.meta = storage.meta();
    cache.settings = storage.settings();
    cache.password = null;

    skipEncryptionPopup = false;

    setStorageService((cache.settings["storage_service"] in OAuth.SERVICE_ID) ?
      OAuth.SERVICE_ID[cache.settings["storage_service"]] : -1);

    checkAutoSync.reset();
    if (cache.settings["sync_period"] !== "Manual") {
      checkAutoSync.setOption("Auto sync");
    }

    setEmailService((cache.settings["email_service"] in OAuth.SERVICE_ID) ?
      OAuth.SERVICE_ID[cache.settings["email_service"]] : -1);

    inputDefaultEmail.val(cache.settings["email_default"]);

    radioTimeFormat.reset();
    radioTimeFormat.setOption(cache.settings["timeFormat"]);

    radioDateFormat.reset();
    radioDateFormat.setOption(cache.settings["dateFormat"]);

    radioWeekStarts.reset();
    radioWeekStarts.setOption(cache.settings["weekStarts"]);

    checkRememberPassword.reset();
    if (cache.settings["encryption_hash"]) {
      checkRememberPassword.setOption("Remember password");
    }
  }

  function _init() {
    page = new widget.Dialog("dg_settings", "Settings", true, document.body);

    page.onClose = function() {
      session.back();
    };

    // Reset password popup
    var popupResetPassword = new widget.PopupPassword(page.element,
      "New password", true);

    popupResetPassword.onOk = function(password) {
      if (password) {
        popupResetPassword.close();
        cache.password = password;
      } else {
        popupResetPassword.message("Invalid password!");
      }
    };

    popupResetPassword.onCancel = function() {
      popupResetPassword.close();
    };

    // Create Dropbox code popup
    dropboxCodePopup = new PopupOAuthCode(OAuth.SERVICE_DROPBOX, page.element);

    // Create Google Drive code popup
    gdriveCodePopup = new PopupOAuthCode(OAuth.SERVICE_GDRIVE, page.element);

    // Create hubiC code popup
    hubicCodePopup = new PopupOAuthCode(OAuth.SERVICE_HUBIC, page.element);

    // Create Gmail code popup
    gmailCodePopup = new PopupOAuthCode(OAuth.SERVICE_GMAIL, page.element);

    // Create Save button
    var btnSave = widget.button("Save",
      "ui-btn ui-btn-icon-left ui-icon-check ui-corner-all ui-shadow",
      null,
      function() {
        save();

        if (compat.C("PLATFORM") === "www") {
          widget.loader("Saving settings...");

          compat.saveSettings(storage.settings(), function(ok) {
            if (ok) {
              widget.loader();
              session.back();
            } else {
              widget.loader("Connection error", true, compat.C(
                "MSG_DELAY"));
              window.setTimeout(function() {
                session.back();
              }, compat.C("MSG_DELAY"));
            }
          });
        } else {
          session.back();
        }
      });

    page.append(btnSave);

    var createSelect = function(parent, label, options, onChange) {
      var controlGroup = new widget.ControlGroup(false, false, false,
        label,
        parent);

      var selectMenu = new widget.SelectMenu(options, false, page.element,
        controlGroup.controls);
      selectMenu.onChangeHandler = onChange;

      $(selectMenu.button).addClass("ui-first-child ui-last-child");

      return selectMenu;
    };

    // Field: Storage service
    selectStorageService = createSelect(widget.createField(page.content),
      "Storage:", ["Local only", "Dropbox", "Google Drive", "hubiC"],
      function(selection) {
        switch (selection) {
          case "Dropbox":
            dropboxCodePopup.show();
            break;
          case "Google Drive":
            gdriveCodePopup.show();
            break;
          case "hubiC":
            hubicCodePopup.show();
            break;
          default:
            setStorageService(-1);
            break;
        }
      });

    // Field: Auto sync
    checkAutoSync = new widget.CheckboxRadio(false, false, false, "", [
      "Auto sync"
    ]);

    widget.createField(page.content, [checkAutoSync.element]);

    // Field: Email service
    selectEmailService = createSelect(widget.createField(page.content),
      "Email:", ["Disabled", "Gmail"],
      function(selection) {
        switch (selection) {
          case "Gmail":
            gmailCodePopup.show();
            break;
          default:
            setEmailService(-1);
            break;
        }
      });

    // Field: Default email
    inputDefaultEmail = new widget.InputText();
    inputDefaultEmail.input.placeholder = "Default email";

    widget.createField(page.content, [widget.createLabel("",
        inputDefaultEmail.name),
      inputDefaultEmail.element
    ]);

    // Field: Time format
    radioTimeFormat = new widget.CheckboxRadio(true, true, false,
      "Time format:", ["12h", "24h"]);

    radioTimeFormat.onChangeHandler = function(option) {
      cache.settings["timeFormat"] = option;
    };

    widget.createField(page.content, [radioTimeFormat.element]);

    // Field: Date format
    radioDateFormat = new widget.CheckboxRadio(true, true, false,
      "Date format:", ["D/M/Y", "Y/M/D", "M/D/Y"]);

    radioDateFormat.onChangeHandler = function(option) {
      cache.settings["dateFormat"] = option;
    };

    widget.createField(page.content, [radioDateFormat.element]);

    // Field: Week starts
    radioWeekStarts = new widget.CheckboxRadio(true, true, false,
      "Week starts:", ["Mon", "Sun"]);

    radioWeekStarts.onChangeHandler = function(option) {
      cache.settings["weekStarts"] = option;
    };

    widget.createField(page.content, [radioWeekStarts.element]);

    // Empty task list popup
    popupEmpty = (function() {
      var popup = new widget.PopupDialog(page.element, false,
        "Empty task list", true);

      var p = document.createElement("p");
      p.style.marginBottom = "1em";
      p.textContent = "Permanently delete all task items?";

      popup.append(p);

      var button = widget
        .button(
          "Empty task list",
          "ui-btn ui-corner-all ui-shadow ui-btn-a ui-btn-icon-left ui-icon-alert",
          null,
          function() {
            var data = {}; // Prepare DB for import

            var settings = storage.settings();

            for (var i in settings) {
              data["agitodo.settings." + i] = settings[i];
            }

            var view = storage.view();

            for (var i in view) {
              data["agitodo.view." + i] = view[i];
            }

            compat.deviceStorage.write(data);

            session.status("sessionLock", "loadDeviceStorage");

            popupEmpty.close();

            session.refresh();
          });

      popup.append(button);

      return popup;
    }());

    // Field: Remember password
    checkRememberPassword = new widget.CheckboxRadio(false, false, false,
      "", ["Remember password"], page.content);

    // Set Password button
    widget.button("Reset password",
      "ui-btn ui-btn-icon-left ui-icon-lock ui-corner-all ui-shadow",
      page.content,
      function() {
        popupResetPassword.show();
      });

    // Empty task list button
    widget.button("Empty task list...",
      "ui-btn ui-btn-icon-left ui-icon-alert ui-corner-all ui-shadow",
      page.content,
      function() {
        popupEmpty.show();
      });
  }

  return {
    "_init": _init,
    "_show": _show,
    "_done": _done,
    "_hide": _hide
  };
}());
