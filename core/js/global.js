var global = (function() {
  var isTouchDevice = false;

  var blockClicks = (function() {
    var coordinates = [];

    function pop() {
      coordinates.splice(0, 2);
    }

    function block(x, y) {
      coordinates.push(x, y);
      window.setTimeout(pop, 2500);
    }

    function onClick(event) {
      var clientX = event.clientX;
      var clientY = event.clientY;

      for (var i = 0; i < coordinates.length; i += 2) {
        var x = coordinates[i];
        var y = coordinates[i + 1];
        if (Math.abs(clientX - x) < 25 && Math.abs(clientY - y) < 25) {
          event.stopPropagation();
          event.preventDefault();
        }
      }
    }

    document.addEventListener("click", onClick, true);

    return block;
  }());

  function onLoad() {
    window.removeEventListener("load", onLoad);

    var checkTouch = function() {
      window.removeEventListener("touchstart", checkTouch, true);
      isTouchDevice = true;
    };

    if (compat.C("PLATFORM") === "Android") {
      isTouchDevice = true;
    } else {
      window.addEventListener("touchstart", checkTouch, true);
    }

    session.navigate("session");
  }

  window.addEventListener("load", onLoad);

  return {
    "blockClicks": blockClicks,
    "isTouchDevice": function() {
      return isTouchDevice;
    }
  };
}());
