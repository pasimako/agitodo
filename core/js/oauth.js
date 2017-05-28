//Prototype: OAuth
function OAuth(service, callback) {
  this.service = service;
  this.callback = (typeof callback === "function") ? callback : function() {};

  this.req = null;
  this.retries = 0;
}

OAuth.prototype.token = function(code, refresh) {
  var code = (typeof code === "string") ? code : "";
  var refresh = (typeof refresh === "boolean") ? refresh : false;

  var self = this;

  var done = function() {
    self.tokenResponse.apply(self, arguments);
  };

  switch (this.service) {
    case OAuth.SERVICE_DROPBOX:
      compat.dropbox.token(code, done);
      break;
    case OAuth.SERVICE_GDRIVE:
      compat.gdrive.token(code, refresh, done);
      break;
    case OAuth.SERVICE_GMAIL:
      compat.gmail.token(code, refresh, done);
      break;
    case OAuth.SERVICE_HUBIC:
      compat.hubic.token(code, refresh, done);
      break;
    default:
      throw "Undefined service";
  }
};

OAuth.prototype.tokenResponse = function(status, body) {
  var data;

  if (status === 200) {
    var response = util.fromJson(body);

    if (util.isObject(response) && typeof response.access_token === "string") {
      data = {};
      data.access_token = response.access_token;
      data.access_token_expires = (typeof response.expires_in === "number") ?
        (new Date().getTime() + (response.expires_in * 1000)) : -1;
      data.refresh_token = (typeof response.refresh_token === "string") ?
        response.refresh_token : undefined;
    }
  }

  this.callback(data);
};

OAuth.prototype.serviceData = function(data) {
  if (typeof data === "undefined") {
    switch (this.service) {
      case OAuth.SERVICE_DROPBOX:
        return storage.settings("storage_dropbox");
      case OAuth.SERVICE_GDRIVE:
        return storage.settings("storage_gdrive");
      case OAuth.SERVICE_GMAIL:
        return storage.settings("email_gmail");
      case OAuth.SERVICE_HUBIC:
        return storage.settings("storage_hubic");
    }
  } else {
    switch (this.service) {
      case OAuth.SERVICE_DROPBOX:
        storage.settings("storage_service", OAuth.SERVICE_NAME[this.service]);
        storage.settings("storage_dropbox", new OAuth.Dropbox(data));
        break;
      case OAuth.SERVICE_GDRIVE:
        storage.settings("storage_service", OAuth.SERVICE_NAME[this.service]);
        storage.settings("storage_gdrive", new OAuth.Google(data));
        break;
      case OAuth.SERVICE_GMAIL:
        storage.settings("email_service", OAuth.SERVICE_NAME[this.service]);
        storage.settings("email_gmail", new OAuth.Google(data));
        break;
      case OAuth.SERVICE_HUBIC:
        storage.settings("storage_service", OAuth.SERVICE_NAME[this.service]);
        storage.settings("storage_hubic", new OAuth.Hubic(data));
        break;
    }
  }
};

OAuth.prototype.resetService = function() {
  switch (this.service) {
    case OAuth.SERVICE_DROPBOX:
    case OAuth.SERVICE_GDRIVE:
    case OAuth.SERVICE_HUBIC:
      storage.settings("storage_service", "");
      storage.settings("storage_dropbox", null);
      storage.settings("storage_gdrive", null);
      storage.settings("storage_hubic", null);
      break;
    case OAuth.SERVICE_GMAIL:
      storage.settings("email_service", "");
      storage.settings("email_gmail", null);
      break;
  }
};

OAuth.prototype.requestResponse = function(status, body) {
  if (status === 401) { // Token expired
    var serviceData = this.serviceData();

    if (serviceData && serviceData.refresh_token && this.retries < 1) {
      var self = this;

      new OAuth(this.service, function(response) {
        if (!response) {
          self.resetService();
          return self.callback();
        }

        response.refresh_token = serviceData.refresh_token;

        self.serviceData(response);

        self.retries++;

        self.req.retry(response.access_token);
      }).token(serviceData.refresh_token, true);
    } else {
      this.resetService();
      this.callback();
    }
  } else {
    this.callback(status, body);
  }
};

OAuth.prototype.request = function() {
  var method = arguments[0];
  var params = Array.prototype.slice.call(arguments, 1);

  var serviceData = this.serviceData();

  if (!serviceData || !serviceData.access_token) {
    this.resetService();
    return this.callback();
  }

  var self = this;

  if (serviceData.access_token_expires !== -1 &&
    serviceData.access_token_expires < new Date().getTime() &&
    serviceData.refresh_token) {
    new OAuth(this.service, function(response) {
      if (!response) {
        self.resetService();
        return self.callback();
      }

      response.refresh_token = serviceData.refresh_token;

      self.serviceData(response);

      self.retries++;

      self.req = new Request(method, response.access_token, function() {
        self.requestResponse.apply(self, arguments);
      });

      self.req.send.apply(self.req, params);
    }).token(serviceData.refresh_token, true);
  } else {
    this.req = new Request(method, serviceData.access_token, function() {
      self.requestResponse.apply(self, arguments);
    });

    this.req.send.apply(this.req, params);
  }
};

OAuth.SERVICE_DROPBOX = 0;
OAuth.SERVICE_GDRIVE = 1;
OAuth.SERVICE_GMAIL = 2;
OAuth.SERVICE_HUBIC = 3;
OAuth.SERVICE_NAME = {
  0: "Dropbox",
  1: "Google Drive",
  2: "Gmail",
  3: "hubiC"
};
OAuth.SERVICE_ID = {
  "Dropbox": OAuth.SERVICE_DROPBOX,
  "Google Drive": OAuth.SERVICE_GDRIVE,
  "Gmail": OAuth.SERVICE_GMAIL,
  "hubiC": OAuth.SERVICE_HUBIC
};

//Prototype: OAuth.Dropbox
OAuth.Dropbox = function(data) {
  var data = util.isObject(data) ? data : {};

  this.access_token = (typeof data.access_token === "string") ?
    data.access_token : "";
  this.access_token_expires = (typeof data.access_token_expires === "number") ?
    data.access_token_expires : -1;
};

// Prototype: OAuth.Google
OAuth.Google = function(data) {
  var data = util.isObject(data) ? data : {};

  this.access_token = (typeof data.access_token === "string") ?
    data.access_token : "";
  this.access_token_expires = (typeof data.access_token_expires === "number") ?
    data.access_token_expires : -1;
  this.refresh_token = (typeof data.refresh_token === "string") ?
    data.refresh_token : "";
};

//Prototype: OAuth.Hubic
OAuth.Hubic = function(data) {
  var data = util.isObject(data) ? data : {};

  this.access_token = (typeof data.access_token === "string") ?
    data.access_token : "";
  this.access_token_expires = (typeof data.access_token_expires === "number") ?
    data.access_token_expires : -1;
  this.refresh_token = (typeof data.refresh_token === "string") ?
    data.refresh_token : "";
  this.openstack_token = (typeof data.openstack_token === "string") ?
    data.openstack_token : "";
  this.openstack_token_expires = (typeof data.openstack_token_expires ===
      "number") ?
    data.openstack_token_expires : -1;
  this.openstack_endpoint = (typeof data.openstack_endpoint === "string") ?
    data.openstack_endpoint : "";
};
