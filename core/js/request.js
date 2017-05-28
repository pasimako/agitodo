//Prototype: Request
function Request(method, access_token, callback) {
  this.method = method;
  this.access_token = access_token;
  this.callback = (typeof callback === "function") ? callback : function() {};
  this.retries = 0;
  this.params = [];
}

Request.prototype.response = function(status, body) {
  if (this.retries > 1) {
    return this.callback(status, body);
  }

  this.retries++;

  switch (status) {
    case 500:
    case 502:
    case 503:
    case 504: // Restart
      var self = this;
      return window.setTimeout(function() {
        self.send.apply(self, self.params);
      }, 1000);
    case 200:
    case 201:
    case 401: // Token expired
    default:
      return this.callback(status, body);
  }
};

Request.prototype.retry = function(access_token) {
  this.access_token = access_token ? access_token : this.access_token;
  this.retries = 0;

  this.send.apply(this, this.params);
};

Request.prototype.send = function() {
  this.params = Array.prototype.slice.call(arguments, 0);

  var self = this;

  var response = function() {
    self.response.apply(self, arguments);
  };

  this.method.apply(null, this.access_token ? [this.access_token].concat(
    this.params, response) : this.params.concat(response));
};
