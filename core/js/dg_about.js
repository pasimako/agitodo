var dg_about = (function() {
  var page = null;

  function _hide() {

  }

  function _done() {
    $(page.element).focus();
  }

  function _show() {

  }

  function _init() {
    page = new widget.Dialog("dg_about", compat.C("APP_NAME"), true,
      document.body);
    page.onClose = session.back;

    var img = document.createElement("img");
    page.append(img);

    img.src = compat.C("IMG_SRC") + "icon-256.png";
    img.style.display = "block";
    img.style.margin = "0 auto";
    img.style.width = "160px";
    img.style.height = "160px";

    page
      .append($("<h3>" +
        compat.C("APP_NAME") +
        "</h3><h4>" +
        compat.C("APP_VERSION") +
        "</h4><p>Copyright &copy; 2013 <a id=\"link-example\" href=\"javascript:void(0)\">My Name</a></p>"
      ));

    $("#link-example").on("click", function() {
      compat.openURL("http://example.com");
    });
  }

  return {
    "_init": _init,
    "_show": _show,
    "_done": _done,
    "_hide": _hide
  };
}());
