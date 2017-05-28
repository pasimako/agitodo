(function() {
  function post(url, headers, body, callback) {
    var req = new XMLHttpRequest();

    req.open("POST", url);

    if (headers) {
      for (var i in headers) {
        req.setRequestHeader(i, headers[i]);
      }
    }

    req.onload = function() {
      return callback ? callback(this.status, this.responseText) :
        undefined;
    };

    req.onerror = function(e) {
      console.log(e);
      return callback ? callback() : undefined;
    };

    req.send(body);
  }

  function onLogin(event) {
    event.stopPropagation();

    var email = document.getElementById("login-email").value;
    var password = document.getElementById("login-password").value;

    if (!email.trim() || !password.trim()) {
      return;
    }

    post("/", {
      "Content-type": "application/json"
    }, JSON.stringify({
      "action": "login",
      "email": email,
      "password": password
    }), function(status, responseText) {
      if (status !== 200 || typeof responseText !== "string") {
        console.log("Invalid email or password!");
        return;
      }

      var reply;

      try {
        reply = JSON.parse(responseText);
      } catch (e) {
        console.log(e);
      }

      if (!reply || typeof reply.ok !== "boolean") {
        console.log("Invalid email or password!");
        return;
      }

      if (reply.ok) {
        window.location = "/app/";
      } else {
        console.log("Invalid email or password!");
      }
    });
  }

  function onLoad() {
    window.removeEventListener("load", onLoad);
    document.getElementById("login-submit").addEventListener("click", onLogin);
  }

  window.addEventListener("load", onLoad);
}());
