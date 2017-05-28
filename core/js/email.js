var email = (function() {
  var gmail = (function() {
    function send(to, subject, content, callback) {
      var callback = (typeof callback === "function") ? callback :
        function() {};

      new OAuth(OAuth.SERVICE_GMAIL, function(status, body) {
        if (status !== 200) {
          return callback();
        }

        var data = util.fromJson(body);

        if (!util.isObject(data)) {
          return callback();
        }

        callback(data);
      }).request(compat.gmail.send, to, subject, content);
    }

    return {
      "send": send
    };
  }());

  function send(to, subject, content, callback) {
    var callback = (typeof callback === "function") ? callback : function() {};

    var done = function(data) {
      if (typeof data === "undefined") {
        compat.log("email.send: connection error");
      }

      callback(data);
    };

    switch (storage.settings("email_service")) {
      case "Gmail":
        gmail.send(to, subject, content, done);
        break;
      default:
        return done();
    }
  }

  return {
    "send": send
  };
}());
