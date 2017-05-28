var widget = (function() {
  var inputNames = [];

  var activePopup = (function() {
    var active = null;

    function close() {
      if (active) {
        try {
          active.close();
        } catch (e) {}
      }

      active = null;
    }

    function pop(popup) {
      active = null;
    }

    function push(popup) {
      close();
      active = popup;
    }

    return {
      "push": push,
      "pop": pop,
      "close": close
    };
  }());

  // Prototype: FastClick
  function FastClick(element, waitTouchMove, handler) {
    this.element = element;
    this.handler = handler;
    this.waitTouchMove = waitTouchMove;
    this.timeoutID = null;

    $(element).on("click touchstart mouseenter mouseleave", null, this,
      this.handleEvent);
  }

  FastClick.prototype.handleEvent = function(event) {
    var self = event.data;

    switch (event.type) {
      case "touchstart":
        self.onTouchStart(event.originalEvent);
        break;
      case "touchend":
        self.onClick(event.originalEvent);
        break;
      case "touchcancel":
        self.reset();
        break;
      case "touchmove":
        self.onTouchMove(event.originalEvent);
        break;
      case "click":
        self.onClick(event.originalEvent);
        break;

      case "mouseenter":
        if (!global.isTouchDevice() &&
          !$(self.element).hasClass("ui-btn-active")) {
          self.highlight(true);
        }
        break;
      case "mouseleave":
        if (!global.isTouchDevice()) {
          self.highlight();
        }
        break;
    }
  };

  FastClick.prototype.highlight = function(highlight) {
    window.clearTimeout(this.timeoutID);
    //$(this.element).blur();

    if (highlight) {
      if (this.waitTouchMove && global.isTouchDevice()) {
        var self = this;

        this.timeoutID = window.setTimeout(function() {
          $(self.element).addClass("clickable-hover");
        }, 80);
      } else {
        $(this.element).addClass("clickable-hover");
      }

    } else {
      $(this.element).removeClass("clickable-hover").blur();
    }
  };

  FastClick.prototype.onTouchStart = function(event) {
    this.highlight(true);

    $(this.element).on("touchend", null, this, this.handleEvent);
    $(this.element).on("touchcancel", null, this, this.handleEvent);
    $(document.body).on("touchmove", null, this, this.handleEvent);

    this.startTouchX = event.touches[0].clientX;
    this.startTouchY = event.touches[0].clientY;
  };

  FastClick.prototype.onTouchMove = function(event) {
    if (Math.abs(event.touches[0].clientX - this.startTouchX) > 10 ||
      Math.abs(event.touches[0].clientY - this.startTouchY) > 10) {

      this.reset();
    }
  };

  FastClick.prototype.onClick = function(event) {
    event.stopPropagation();
    event.preventDefault();

    if (event.type === "touchend") {
      global.blockClicks(this.startTouchX, this.startTouchY);
    }

    this.reset();

    this.handler.call(this.element, event);
  };

  FastClick.prototype.reset = function() {
    $(this.element).off("touchend", null, this.handleEvent);
    $(this.element).off("touchcancel", null, this.handleEvent);
    $(document.body).off("touchmove", null, this.handleEvent);

    this.highlight();
  };

  function onClick(element, handler, waitTouchMove) {
    element.fastClick = new FastClick(element, waitTouchMove, handler);
    return element.fastClick;
  }

  function button(text, className, parent, handler, waitTouchMove) {
    var a = document.createElement("a");
    a.href = "javascript:void(0)";

    if (className) {
      a.className = className;
    }

    a.textContent = text ? text : "";

    if (handler) {
      onClick(a, handler, waitTouchMove);
    }

    if (parent) {
      parent.appendChild(a);
    }

    return a;
  }

  var loader = (function() {
    var element = null;
    var screen = null;
    var h1 = null;

    function init() {
      element = document.createElement("div");
      element.className =
        "ui-loader ui-corner-all ui-body-a ui-loader-verbose";

      var span = document.createElement("span");
      span.className = "ui-icon-loading";
      element.appendChild(span);

      h1 = document.createElement("h1");
      element.appendChild(h1);

      document.body.appendChild(element);

      screen = document.createElement("div");
      screen.className =
        "ui-screen-hidden ui-popup-screen ui-overlay-a";
      screen.style.opacity = "0.5";
      screen.style.zIndex = parseInt($(element).css("z-index"), 10) - 1;

      document.body.appendChild(screen);
    }

    function show(msg, textonly, timeout) {
      if (!element) {
        init();
      }

      if (msg) {
        if (textonly) {
          $(element).addClass("ui-loader-textonly");
        } else {
          $(element).removeClass("ui-loader-textonly");
        }

        $(h1).text(msg);

        $(screen).removeClass("ui-screen-hidden");
        $(document.documentElement).addClass("ui-loading");

        if (typeof timeout === "number") {
          window.setTimeout(function() {
            show();
          }, timeout);
        }
      } else {
        $(document.documentElement).removeClass("ui-loading");
        $(screen).addClass("ui-screen-hidden");
      }
    }

    return show;
  }());

  // Prototype: Page
  function Page(id, parent) {
    this.element = document.createElement("div");
    this.element.id = id;
    this.element.className =
      "ui-page ui-page-theme-a ui-page-header-fixed ui-page-footer-fixed";
    this.element.tabIndex = 0;

    this.element.setAttribute("data-role", "page");

    var self = this;

    // Create header
    var header = document.createElement("div");
    this.element.appendChild(header);
    // header.className = "ui-header ui-bar-inherit ui-header-fixed slidedown";
    header.className =
      "ui-header ui-bar-inherit ui-header-fixed slidedown ui-shadow";

    this.onNavigate = null;
    this.btnNavigate = button("",
      "ui-btn-left ui-btn ui-corner-all ui-mini",
      header,
      function() {
        if (self.onNavigate) {
          self.onNavigate.call(this);
        }
      });

    this.elementHeader = document.createElement("span");
    this.elementHeader.className = "ui-title";
    this.elementHeader.textContent = "Agitodo";

    $(this.elementHeader).css("visibility", "hidden");

    header.appendChild(this.elementHeader);

    this.onGear = null;
    button("",
      "ui-btn-right ui-btn ui-icon-gear ui-btn-icon-notext ui-corner-all",
      header,
      function() {
        if (self.onGear) {
          self.onGear.call(this);
        }
      });

    // Create content
    this.content = document.createElement("div");
    this.element.appendChild(this.content);
    this.content.className = "ui-content";

    // Create footer
    this.footer = document.createElement("div");
    this.footer.className =
      "ui-footer ui-bar-inherit ui-footer-fixed slideup";
    // this.footer.className = "ui-footer ui-bar-inherit ui-footer-fixed slideup
    // ui-shadow";

    this.footerTitle = document.createElement("h4");
    this.footerTitle.className = "ui-title";

    this.footer.appendChild(this.footerTitle);

    this.element.appendChild(this.footer);

    if (parent) {
      parent.appendChild(this.element);
    }

    $(window).on("resize", function() {
      self.refresh();
    });
  }

  Page.prototype.refresh = function() {
    if (!$(this.element).is(":visible")) {
      return;
    }

    var navWidth = $(this.btnNavigate).outerWidth();
    var navOffset = $(this.btnNavigate).offset();

    var titleOffset = $(this.elementHeader).offset();

    if (titleOffset.left < (navOffset.left + navWidth)) {
      $(this.elementHeader).css("visibility", "hidden");
    } else {
      $(this.elementHeader).css("visibility", "visible");
    }
  };

  Page.prototype.headerHtml = function(html) {
    $(this.elementHeader).html(html);
  };

  Page.prototype.footerHtml = function(html) {
    $(this.footerTitle).html(html);
  };

  Page.prototype.empty = function() {
    $(this.content).empty();
  };

  Page.prototype.append = function(element) {
    $(this.content).append(element);
  };

  Page.prototype.navText = function(text) {
    $(this.btnNavigate).text(text);
  };

  // Prototype: Dialog
  function Dialog(id, title, closeButton, parent) {
    var self = this;
    this.onClose = null;

    this.element = document.createElement("div");
    this.element.id = id;
    this.element.className =
      "ui-page ui-page-theme-a ui-dialog ui-page-header-fixed";
    this.element.tabIndex = 0;
    this.element.style = "min-width:300px;";

    this.element.setAttribute("data-dialog", "true");
    this.element.setAttribute("data-role", "page");

    this.container = document.createElement("div");
    this.element.appendChild(this.container);
    this.container.className =
      "ui-dialog-contain ui-overlay-shadow ui-corner-all";
    this.container.setAttribute("role", "dialog");

    // Create header
    var header = document.createElement("div");
    this.container.appendChild(header);
    header.className = "ui-header ui-bar-inherit ui-header-fixed slidedown";

    if (closeButton) {
      button("Close",
        "ui-btn-left ui-btn ui-icon-delete ui-btn-icon-notext ui-corner-all",
        header,
        function() {
          self.onCloseHandler();
        });
    }

    this.elementTitle = document.createElement("h1");
    header.appendChild(this.elementTitle);
    this.elementTitle.className = "ui-title";
    this.elementTitle.textContent = title;

    // Create content
    this.content = document.createElement("div");
    this.container.appendChild(this.content);
    this.content.className = "ui-content";

    if (closeButton) {
      $(document).on("keydown", function(event) {
        if (!$(self.element).is(":visible")) {
          return;
        }

        self.onKeydown(event);
      });
    }

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  Dialog.prototype.onCloseHandler = function() {
    if (this.onClose) {
      this.onClose();
    }
  };

  Dialog.prototype.setTitle = function(text) {
    $(this.elementTitle).text(text);
  };

  Dialog.prototype.empty = function() {
    $(this.content).empty();
  };

  Dialog.prototype.append = function(element) {
    $(this.content).append(element);
  };

  Dialog.prototype.onKeydown = function(event) {
    var code = event.keyCode || event.which;

    if (code == 27) { // "Esc" keycode
      this.onCloseHandler();
    }
  };

  // Prototype: Popup
  function Popup(parent, dismissible, overlay) {
    var self = this;

    this.visible = false;
    this.rect = null;
    this.dismissible = (typeof dismissible === "boolean") ? dismissible :
      false;
    this.overlay = (typeof overlay === "boolean") ? overlay : false;

    this.beforePosition = null;
    this.afterOpen = null;
    this.beforeDismiss = null;
    this.afterClose = null;

    this.positionTo = null;

    this.element = document.createElement("div");
    this.element.className =
      "ui-popup-container ui-popup-hidden ui-popup-truncate";

    this.main = document.createElement("div");
    this.element.appendChild(this.main);
    this.main.className =
      "ui-popup ui-body-a ui-overlay-shadow ui-corner-all";

    this.screen = document.createElement("div");
    this.screen.className = "ui-screen-hidden ui-popup-screen ui-overlay-a";
    this.screen.style.opacity = "0.5";

    if (parent) {
      parent.appendChild(this.screen);
      parent.appendChild(this.element);
    }

    // After appending to DOM
    this.screen.style.zIndex = parseInt($(this.element).css("z-index"), 10) -
      1;
  }

  Popup.prototype.onDismiss = function(event) {
    var self = event.data;

    if (!self.visible || self.rect === null) {
      return;
    }

    var pageY = 0;
    var pageX = 0;

    if (event.type === "click") {
      pageY = event.originalEvent.pageY;
      pageX = event.originalEvent.pageX;
    } else {
      pageY = event.originalEvent.touches[0].pageY;
      pageX = event.originalEvent.touches[0].pageX;
    }

    if (pageY < self.rect.top || pageY > self.rect.bottom ||
      pageX < self.rect.left || pageX > self.rect.right) {
      if (self.beforeDismiss) {
        var ok = self.beforeDismiss(pageX, pageY);
        if (typeof ok === "boolean" && !ok) {
          return;
        }
      }

      self.close();
    }
  };

  Popup.prototype.onResize = function(event) {
    var self = event.data;

    if (!self.visible) {
      return;
    }

    self.position(self.positionTo);
    self.autoSize()
  };

  Popup.prototype.onScroll = function(event) {
    var self = event.data;

    if (!self.visible) {
      return;
    }

    self.position(self.positionTo);
  };

  Popup.prototype.show = function(positionTo) {
    if (this.visible) {
      return;
    }

    activePopup.push(this);

    $(this.element).removeClass("ui-popup-truncate");

    if (typeof this.beforePosition === "function") {
      this.beforePosition();
    }

    this.positionTo = positionTo ? positionTo : null;

    this.position(this.positionTo);
    this.autoSize();

    $(window).on("resize", null, this, this.onResize).on("scroll", null,
      this,
      this.onScroll);

    if (this.dismissible) {
      $(document).on("click touchstart", null, this, this.onDismiss);
    }

    if (this.overlay) {
      $(this.screen).removeClass("ui-screen-hidden");
    }

    /*
     * var self = this; $(this.element).fadeIn(300, function () { self.visible =
     * true;
     *
     * if (typeof self.afterOpen === "function") { self.afterOpen(); } });
     */

    $(this.element).removeClass("ui-popup-hidden").addClass(
      "ui-popup-active");

    this.visible = true;

    if (typeof this.afterOpen === "function") {
      this.afterOpen();
    }
  };

  Popup.prototype.close = function() {
    $(this.element).removeClass("ui-popup-active").addClass(
      "ui-popup-hidden ui-popup-truncate").css({
      "top": 0,
      "left": 0
    }); // .addClass("ui-popup-hidden ui-popup-truncate");

    $(window).off("resize", null, this.onResize).off("scroll", null,
      this.onScroll);

    if (this.dismissible) {
      $(document).off("click touchstart", null, this.onDismiss);
    }

    if (this.overlay) {
      $(this.screen).addClass("ui-screen-hidden");
    }

    this.positionTo = null;

    /*
     * var self = this; $(this.element).fadeOut(300, function () { self.visible =
     * false;
     *
     * if (typeof self.afterClose === "function") { self.afterClose(); } });
     */

    this.visible = false;

    activePopup.pop();

    if (typeof this.afterClose === "function") {
      this.afterClose();
    }
  };

  Popup.prototype.empty = function() {
    $(this.main).empty();
  };

  Popup.prototype.append = function(element) {
    $(this.main).append(element);
  };

  Popup.prototype.style = function(style) {
    for (var i in style) {
      if (!(i in this.main.style)) {
        continue;
      }
      this.main.style[i] = style[i];
    }
  };

  Popup.prototype.autoSize = function() {
    var width = $(this.element).width();
    var height = $(this.element).height();
    var offset = $(this.element).offset();

    var viewportWidth = window.innerWidth;
    var viewportLeft = $(document).scrollLeft();
    var viewportRight = viewportLeft + viewportWidth;

    var diff = (offset.left + width) - viewportRight;
    var newWidth = width;

    if (diff > 0) {
      var newWidth = width - diff;
      if (newWidth > 0) {
        $(this.element).width(newWidth);
      }
    }

    this.rect = {
      top: offset.top,
      left: offset.left,
      bottom: offset.top + height,
      right: offset.left + newWidth
    };
  };

  Popup.prototype.position = function(positionTo) {
    $(this.element).css({
      width: "auto"
    });

    var left = 0;
    var top = 0;
    var width = $(this.element).width();
    var height = $(this.element).height();

    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var viewportLeft = $(document).scrollLeft();
    var viewportTop = $(document).scrollTop();
    var viewportRight = viewportLeft + viewportWidth;
    var viewportBottom = viewportTop + viewportHeight;

    var minLeft = viewportLeft + 15;
    var minTop = viewportTop + 30;
    var minRight = viewportRight - 15;
    var minBottom = viewportBottom - 30;

    var refLeft = 0;
    var refTop = 0;
    var refWidth = positionTo ? $(positionTo).width() : viewportWidth;
    var refHeight = positionTo ? $(positionTo).height() : viewportHeight;

    if (positionTo) {
      var offset = $(positionTo).offset();
      refLeft = offset.left;
      refTop = offset.top;
    } else {
      refLeft = viewportLeft;
      refTop = viewportTop;
    }

    left = refLeft + (refWidth / 2) - (width / 2);
    top = refTop + (refHeight / 2) - (height / 2);

    // Check if outside viewport
    if (left < minLeft) {
      left = minLeft;
    }

    if (top < minTop) {
      top = minTop;
    }

    if ((left + width) > minRight) {
      var newLeft = minRight - width;
      left = (newLeft < minLeft) ? minLeft : newLeft;
    }

    if ((top + height) > minBottom) {
      var newTop = minBottom - height;
      top = (newTop < minTop) ? minTop : newTop;
    }

    // Set new coordinates
    $(this.element).css({
      position: "absolute",
      top: top,
      left: left
    });

    this.rect = {
      top: top,
      left: left,
      bottom: top + height,
      right: left + width
    };
  };

  // Prototype: PopupDialog
  function PopupDialog(parent, dismissible, title, overlay) {
    Popup.call(this, parent, dismissible, overlay);

    var self = this;

    this.style({
      "minWidth": "250px"
    });

    // Header
    var header = document.createElement("div");
    this.main.appendChild(header);

    header.className = "ui-header ui-bar-inherit";

    button(
      "Close",
      "ui-btn-left ui-btn ui-btn-a ui-icon-delete ui-btn-icon-notext ui-shadow ui-corner-all",
      header,
      function() {
        self.close();
      });

    this.title = document.createElement("h1");
    header.appendChild(this.title);

    this.title.className = "ui-title";
    this.title.textContent = title;

    // Content
    this.content = document.createElement("div");
    this.main.appendChild(this.content);

    this.content.className = "ui-content";

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  PopupDialog.prototype = Object.create(Popup.prototype);

  PopupDialog.prototype.constructor = PopupDialog;

  PopupDialog.prototype.setTitle = function(title) {
    $(this.title).text(title);
  };

  PopupDialog.prototype.empty = function() {
    $(this.content).empty();
  };

  PopupDialog.prototype.append = function(element) {
    $(this.content).append(element);
  };

  // Prototype: PopupPassword
  function PopupPassword(parent, title, verify) {
    Popup.call(this, parent, false, true);

    var self = this;
    this.onOk = null;
    this.onCancel = null;

    this.style({
      "minWidth": "15em",
      "maxWidth": "20em",
      "padding": "10px 20px"
    });

    var el;

    el = document.createElement("h3");
    el.textContent = title ? title : "Enter password";

    this.append(el);

    this.inputPassword = new widget.InputText(true);
    this.inputPassword.input.type = "password";
    this.inputPassword.input.placeholder = "password";
    this.inputPassword.onEnterHandler = function() {
      self.actionOk();
    };

    this.append(this.inputPassword.element);

    if (verify) {
      el = document.createElement("h3");
      el.textContent = "Verify password";
      this.append(el);

      this.inputVerify = new widget.InputText(true);
      this.inputVerify.input.type = "password";
      this.inputVerify.input.placeholder = "password";
      this.inputVerify.onEnterHandler = function() {
        self.actionOk();
      };

      this.append(this.inputVerify.element);
    } else {
      this.checkRemember = new CheckboxRadio(false, false, true, "", [
        "Remember password"
      ]);
      this.append(this.checkRemember.element);
    }

    var btnOk = button(
      "Ok",
      "ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-a ui-btn-icon-left ui-icon-check",
      null,
      function() {
        self.actionOk();
      });

    this.append(btnOk);

    var btnCancel = button(
      "Cancel",
      "ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-a ui-btn-icon-left ui-icon-delete",
      null,
      function() {
        self.actionCancel();
      });

    this.append(btnCancel);

    this.afterOpen = function() {
      self.refresh();
    };
  }

  PopupPassword.prototype = Object.create(Popup.prototype);

  PopupPassword.prototype.constructor = PopupPassword;

  PopupPassword.prototype.actionOk = function() {
    var password = this.inputPassword.val();

    if (this.inputVerify) {
      var verify = this.inputVerify.val();

      if (password !== verify) {
        return this.message("Password mismatch!");
      }
    }

    return this.onOk ? this.onOk(password) : undefined;
  };

  PopupPassword.prototype.actionCancel = function() {
    return this.onCancel ? this.onCancel() : undefined;
  };

  PopupPassword.prototype.password = function(text) {
    if (typeof text !== "undefined") {
      this.inputPassword.val(text);
    }

    return this.inputPassword.val();
  };

  PopupPassword.prototype.message = function(msg) {
    widget.loader(msg, true, 1000);
  };

  PopupPassword.prototype.refresh = function() {
    this.inputPassword.val("");
    this.inputPassword.focus();

    if (this.inputVerify) {
      this.inputVerify.val("");
    }
  };

  // Prototype: Listview
  function Listview(inset, parent) {
    this.element = document.createElement("ul");
    this.element.className = "ui-listview ui-corner-all ui-shadow" +
      (inset ? " ui-listview-inset" : "");

    this.items = [];

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  Listview.prototype.empty = function() {
    $(this.element).empty();
    this.items = [];
  };

  Listview.prototype.insert = function(li) {
    if (this.items.length) {
      $(this.items[this.items.length - 1]).removeClass("ui-last-child");
    } else {
      $(li).addClass("ui-first-child");
    }

    $(li).addClass("ui-last-child");

    this.element.appendChild(li);

    this.items.push(li);
  };

  Listview.prototype.insertDivider = function(html, highlight, counter) {
    var li = document.createElement("li");

    li.className = "ui-li-divider ui-bar-inherit";

    if (highlight) {
      li.className += " highlight";
    }

    if (typeof counter === "number") {
      li.className += " ui-li-has-count";
    }

    li.innerHTML = html;

    if (typeof counter === "number") {
      var span = document.createElement("span");
      li.appendChild(span);

      span.className = "ui-li-count ui-body-inherit";
      span.textContent = counter;

      if (counter === 0) {
        span.style.display = "none";
      }
    }

    this.insert(li);

    return li;
  };

  Listview.prototype.insertItem = function(element, splitElement) {
    var li = document.createElement("li");

    li.appendChild(element);

    if (splitElement) {
      li.className = "ui-li-has-alt ui-li-has-icon";
      li.appendChild(splitElement);
    }

    this.insert(li);

    return li;
  };

  Listview.prototype.insertTask = function(taskID, date, onChange,
    beforeChange) {
    var task = storage.task(taskID);
    if (!task) {
      return;
    }

    var onChange = onChange ? onChange : null;
    var beforeChange = beforeChange ? beforeChange : null;

    var isComplete = util.contains(task.history, date);

    var self = this;

    // First half of split button
    var btnFirst = button("", "ui-btn", null, function(event) {
      if (beforeChange) {
        if (!beforeChange()) {
          return;
        }
      }
      self.onClick.call(this, onChange);
    });

    btnFirst.setAttribute("data-task-id", taskID);
    btnFirst.setAttribute("data-date", date);

    var img = document.createElement("img");
    img.className = "ui-li-icon ui-corner-none";
    img.style.margin = 0;
    img.src = compat.C("IMG_SRC") +
      (isComplete ? "check-green.svg" : "clock-black.svg");

    btnFirst.appendChild(img);

    var h2 = document.createElement("h2");
    h2.className = "task-title";
    h2.className += isComplete ? " check" : "";

    var span = document.createElement("span");
    span.className = "task-title-text";
    span.textContent = task.title;

    h2.appendChild(span);

    btnFirst.appendChild(h2);

    var time = util.strToTime(task.time);
    var infoTxt = time ? util.timeToStr(time.hours, time.minutes) : "";

    if (infoTxt) {
      var p = document.createElement("p");
      p.className = "task-subtitle";
      p.className += isComplete ? " check" : "";
      p.innerHTML = infoTxt;

      btnFirst.appendChild(p);
    }

    // Second half of split button
    var btnSecond = button("Edit task",
      "ui-btn ui-btn-icon-notext ui-icon-edit ui-btn-a", null,
      function() {
        if (beforeChange) {
          if (!beforeChange()) {
            return;
          }
        }

        self.onEdit.call(this);
      });

    btnSecond.setAttribute("data-task-id", taskID);

    return this.insertItem(btnFirst, btnSecond);
  };

  Listview.prototype.onEdit = function() {
    dg_edit.preloadTask($(this).attr("data-task-id"));
    session.navigate("dg_edit");
  };

  Listview.prototype.onClick = function(onChange) {
    var taskID = $(this).attr("data-task-id");

    var task = storage.task(taskID);
    if (!task) {
      return;
    }

    var date = parseInt($(this).attr("data-date"), 10);

    var span = $(this).parent("li").prevAll(
        "li.ui-li-divider[data-date=" + date + "]").first().children(
        "span")
      .first();
    if (!span.length) {
      return;
    }

    var counter = parseInt(span.text(), 10);

    var history = task.history;
    var ix = history.indexOf(date);

    if (ix === -1) {
      $(this).children("img").first().attr("src",
        compat.C("IMG_SRC") + "check-green.svg");
      $(this).children("h2.task-title").first().addClass("check");
      $(this).children("p.task-subtitle").first().addClass("check");

      history.push(date);
      counter--;
    } else {
      $(this).children("img").attr("src",
        compat.C("IMG_SRC") + "clock-black.svg");
      $(this).children("h2.task-title").first().removeClass("check");
      $(this).children("p.task-subtitle").first().removeClass("check");

      history.splice(ix, 1);
      counter++;
    }

    if (onChange) {
      onChange(ix === -1, date);
    }

    span.text(counter);

    if (counter > 0) {
      span.show();
    } else {
      span.hide();
    }

    tasks.update(taskID, {
      "history": history
    });
  };

  // Prototype: PopupNavigate
  function PopupNavigate(parent) {
    Popup.call(this, parent, true);

    var listview = new Listview(false);
    listview.element.style.minWidth = "200px";

    this.append(listview.element);

    // Day
    var btnDay = button("Day", "ui-btn ui-btn-icon-left ui-icon-day", null,
      function() {
        session.navigate("pg_day");
      });

    listview.insertItem(btnDay);

    // Week
    var btnWeek = button("Week", "ui-btn ui-btn-icon-left ui-icon-week",
      null,
      function() {
        session.navigate("pg_week");
      });

    listview.insertItem(btnWeek);

    // Month
    var btnMonth = button("Month", "ui-btn ui-btn-icon-left ui-icon-month",
      null,
      function() {
        session.navigate("pg_month");
      });

    listview.insertItem(btnMonth);

    // Task Pool
    var btnTaskList = button("Task list",
      "ui-btn ui-btn-icon-left ui-icon-bullets", null,
      function() {
        session.navigate("pg_taskList");
      });

    listview.insertItem(btnTaskList);

    switch (session.status("currentPage")) {
      case "pg_day":
        $(btnDay).addClass("ui-state-disabled");
        break;
      case "pg_week":
        $(btnWeek).addClass("ui-state-disabled");
        break;
      case "pg_month":
        $(btnMonth).addClass("ui-state-disabled");
        break;
      case "pg_taskList":
        $(btnTaskList).addClass("ui-state-disabled");
        break;
    }
  }

  PopupNavigate.prototype = Object.create(Popup.prototype);

  PopupNavigate.prototype.constructor = PopupNavigate;

  // Prototype: PopupGear
  function PopupGear(parent) {
    Popup.call(this, parent, true);

    var self = this;

    var listview = new Listview(false);
    listview.element.style.minWidth = "200px";

    this.append(listview.element);

    var btnSettings = button("Settings",
      "ui-btn ui-btn-icon-left ui-icon-gear", null,
      function() {
        session.navigate("dg_settings");
      });

    listview.insertItem(btnSettings);

    this.btnSync = button("Sync now",
      "ui-btn ui-btn-icon-left ui-icon-cloud",
      null,
      function() {
        self.close();
        sync.start();
      });

    listview.insertItem(this.btnSync);

    var btnAbout = button("About", "ui-btn ui-btn-icon-left ui-icon-info",
      null,
      function() {
        session.navigate("dg_about");
      });

    listview.insertItem(btnAbout);

    if (compat.C("PLATFORM") === "www") {
      var btnLogout = button("Log out",
        "ui-btn ui-btn-icon-left ui-icon-power", null,
        function() {
          self.close();
          compat.exit();
        });

      listview.insertItem(btnLogout);
    }

    this.beforePosition = function() {
      if (storage.settings("storage_service")) {
        $(self.btnSync).removeClass("ui-state-disabled");
      } else {
        $(self.btnSync).addClass("ui-state-disabled");
      }
    };
  }

  PopupGear.prototype = Object.create(Popup.prototype);

  PopupGear.prototype.constructor = PopupGear;

  // Prototype: DateNavigator
  function DateNavigator(parent, handler) {
    var self = this;

    this.handler = (typeof handler === "function") ? handler : null;

    this.element = document.createElement("div");
    this.element.className = "date-navigator";

    button(
      "Previous",
      "ui-btn ui-btn-inline ui-mini ui-corner-all ui-shadow ui-icon-arrow-l ui-btn-icon-notext",
      this.element,
      function() {
        self.previous();
      });

    button("Today", "ui-btn ui-btn-inline ui-mini ui-corner-all ui-shadow",
      this.element,
      function() {
        self.today();
      });

    button(
      "Next",
      "ui-btn ui-btn-inline ui-mini ui-corner-all ui-shadow ui-icon-arrow-r ui-btn-icon-notext",
      this.element,
      function() {
        self.next();
      });

    this.startTouchX = null;
    this.startTouchY = null;
    this.timeoutID = null;

    $(document).on("touchstart", null, this, this.onSwipe);

    this.parent = null;

    if (parent) {
      this.parent = parent;

      parent.appendChild(this.element);
    }
  }

  DateNavigator.prototype.resetSwipe = function() {
    window.clearTimeout(this.timeoutID);
    this.timeoutID = null;

    $(document).off("touchmove", null, this.onSwipe);

    this.startTouchX = null;
    this.startTouchY = null;
  };

  DateNavigator.prototype.onSwipe = function(event) {
    var self = event.data;

    if (!$(self.element).is(":visible")) {
      return;
    }

    var x = event.originalEvent.touches[0].pageX;
    var y = event.originalEvent.touches[0].pageY;

    switch (event.type) {
      case "touchstart":
        self.resetSwipe();

        self.startTouchX = x;
        self.startTouchY = y;
        $(document).on("touchmove", null, self, self.onSwipe);

        self.timeoutID = window.setTimeout(function() {
          self.resetSwipe();
        }, 300);
        break;
      case "touchmove":
        if (self.startTouchX === null || self.startTouchY === null) {
          return;
        }

        var dx = self.startTouchX - x;
        var dy = self.startTouchY - y;

        if (Math.abs(dy) > 50) {
          self.resetSwipe();
        } else if (Math.abs(dx) > 80) {
          event.originalEvent.preventDefault();
          event.originalEvent.stopPropagation();

          self.resetSwipe();

          return (dx > 0) ? self.next() : self.previous();
        }

        break;
    }
  };

  DateNavigator.prototype.previous = function() {
    if (typeof this.handler === "function") {
      this.handler(-1);
    }
  };

  DateNavigator.prototype.today = function() {
    if (typeof this.handler === "function") {
      this.handler(0);
    }
  };

  DateNavigator.prototype.next = function() {
    if (typeof this.handler === "function") {
      this.handler(1);
    }
  };

  // Prototype: InputText
  function InputText(hasClear, disabled, readOnly, parent) {
    var self = this;

    this.btnClear = null;
    this.onInputHandler = null;
    this.onEnterHandler = null;

    this.element = document.createElement("div");
    this.element.className =
      "ui-input-text ui-body-inherit ui-corner-all ui-shadow-inset";

    if (hasClear) {
      this.element.className += " ui-input-has-clear";
    }

    if (disabled) {
      this.element.className += " ui-state-disabled";
    }

    this.input = document.createElement("input");
    this.element.appendChild(this.input);

    this.input.type = "text";
    this.input.value = "";

    if (readOnly) {
      this.input.readOnly = true;
    }

    var name;

    do {
      name = util.randomString(6, true);
    } while (inputNames.indexOf(name) !== -1);

    inputNames.push(name);

    this.input.name = name;

    if (hasClear) {
      this.btnClear = button(
        "Clear",
        "ui-input-clear ui-btn ui-icon-delete ui-btn-icon-notext ui-corner-all",
        null,
        function() {
          self.clear();
        });

      this.btnClear.style.display = "none";

      this.element.appendChild(this.btnClear);
    }

    $(this.input).on("input", function() {
      self.onInput();
    }).on("keypress", function(event) {
      self.onKeypress(event);
    });

    // $(this.input).on("focus", this.focus).on("blur", this.blur);

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  InputText.prototype.disabled = function(disabled) {
    if (typeof disabled === "boolean") {
      if (disabled) {
        $(this.element).addClass("ui-state-disabled");
      } else {
        $(this.element).removeClass("ui-state-disabled");
      }
    } else {
      $(this.element).addClass("ui-state-disabled");
    }
  };

  InputText.prototype.onKeypress = function(event) {
    if (!this.onEnterHandler) {
      return;
    }

    var code = event.keyCode || event.which;

    if (code == 13) { // "Enter" keycode
      this.onEnterHandler.call(this)
    }
  };

  InputText.prototype.onInput = function() {
    if (this.btnClear) {
      if (this.val()) {
        $(this.btnClear).show();
      } else {
        $(this.btnClear).hide();
      }
    }

    if (this.onInputHandler) {
      this.onInputHandler.call(this);
    }
  };

  InputText.prototype.clear = function() {
    this.val("");

    if (this.btnClear) {
      $(this.btnClear).hide();
    }

    this.focus();
  };

  InputText.prototype.val = function(value) {
    if (typeof value === "string") {
      $(this.input).val(value);

      if (this.btnClear) {
        if (value) {
          $(this.btnClear).show();
        } else {
          $(this.btnClear).hide();
        }
      }
    } else {
      return $(this.input).val();
    }
  };

  InputText.prototype.focus = function() {
    $(this.input).focus();
    // $(this.element).addClass("ui-focus");
  };

  InputText.prototype.blur = function() {
    $(this.input).blur();
    // $(this.element).removeClass("ui-focus");
  };

  function FlipSwitch(options, parent) {
    var self = this;
    this.onChange = null;

    this.element = document.createElement("div");
    this.element.className =
      "ui-flipswitch ui-shadow-inset ui-bar-inherit ui-corner-all";

    this.options = options;
    this.selection = options[0];

    var span = document.createElement("span");
    this.element.appendChild(span);
    span.className = "ui-flipswitch-on ui-btn ui-shadow ui-btn-inherit";
    span.textContent = options[1];

    var span = document.createElement("span");
    this.element.appendChild(span);
    span.className = "ui-flipswitch-off";
    span.textContent = options[0];

    var select = document.createElement("select");
    this.element.appendChild(select);
    select.className = "ui-flipswitch-input";
    select.tabIndex = -1;

    var el;

    el = document.createElement("option");
    select.appendChild(el);
    el.value = options[0];

    el = document.createElement("option");
    select.appendChild(el);
    el.value = options[1];

    $(this.element).on("click", function() {
      self.onClick();
    });

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  FlipSwitch.prototype.onClick = function() {
    this.val(this.options[$(this.element).hasClass("ui-flipswitch-active") ?
      0 :
      1]);
  };

  FlipSwitch.prototype.val = function(value) {
    if (typeof value === "string") {
      switch (this.options.indexOf(value)) {
        case 0:
          $(this.element).removeClass("ui-flipswitch-active");
          break;
        case 1:
          $(this.element).addClass("ui-flipswitch-active");
          break;
        default:
          return;
      }

      this.selection = value;

      if (this.onChange) {
        this.onChange(this.selection);
      }
    }

    return this.selection;
  };

  function ControlGroup(horizontal, mini, shadow, labelText, parent) {
    this.element = document.createElement("fieldset");
    this.element.className = "ui-controlgroup ui-corner-all" +
      (mini ? " ui-mini" : "") + (shadow ? " ui-shadow" : "");
    this.element.className += horizontal ? " ui-controlgroup-horizontal" :
      " ui-controlgroup-vertical";

    if (typeof labelText === "string") {
      var label = document.createElement("div");
      label.className = "ui-controlgroup-label";

      this.element.appendChild(label);

      var legend = document.createElement("legend");
      legend.textContent = labelText;

      label.appendChild(legend);
    }

    this.controls = document.createElement("div");
    this.controls.className = "ui-controlgroup-controls";

    this.element.appendChild(this.controls);

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  function CheckboxRadio(isRadio,
    isHorizontal,
    isMini,
    labelText,
    options,
    parent) {
    var self = this;
    this.classOn = isRadio ? "ui-radio-on" : "ui-checkbox-on";
    this.classOff = isRadio ? "ui-radio-off" : "ui-checkbox-off";
    this.isHorizontal = (typeof isHorizontal === "boolean" && isHorizontal);
    this.children = {};
    this.checked = [];
    this.onChangeHandler = null;

    var controlGroup = new ControlGroup(isHorizontal, isMini, false,
      labelText);

    this.element = controlGroup.element;

    var name = "";

    do {
      name = util.randomString(6, true);
    } while (inputNames.indexOf(name) !== -1);

    inputNames.push(name);

    var onClickHandler = isRadio ? function() {
      self.onRadio(this);
    } : function() {
      self.onCheck(this);
    };

    for (var i = 0; i < options.length; i++) {
      var div = document.createElement("div");
      controlGroup.controls.appendChild(div);
      div.className = isRadio ? "ui-radio" : "ui-checkbox";

      if (isMini) {
        div.className += " ui-mini";
      }

      var label = document.createElement("label");
      div.appendChild(label);
      label.className = "ui-btn ui-corner-all ui-btn-inherit " + this.classOff;

      if (!isHorizontal) {
        label.className += " ui-btn-icon-left";
      }

      if (i === 0) {
        label.className += " ui-first-child";
      }

      if (i === (options.length - 1)) {
        label.className += " ui-last-child";
      }

      label.textContent = options[i];

      // $(label).on("click", onClickHandler);

      onClick(label, onClickHandler);

      var input = document.createElement("input");
      div.appendChild(input);
      input.type = isRadio ? "radio" : "checkbox";
      input.value = options[i].replace(new RegExp("/", "g"), "");
      input.name = name;

      // this.children[options[i]] = div;
      this.children[input.value] = div;
    }

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  CheckboxRadio.prototype.disabled = function(disabled) {
    var state_disabled = (typeof disabled === "boolean") ? disabled :
      true;

    for (var i in this.children) {
      if (state_disabled) {
        $(this.children[i]).addClass("ui-state-disabled");
      } else {
        $(this.children[i]).removeClass("ui-state-disabled");
      }
    }
  };

  CheckboxRadio.prototype.reset = function() {
    for (var i in this.children) {
      $(this.children[i]).children("label").removeClass(this.classOn)
        .removeClass("ui-btn-active").addClass(this.classOff);
    }

    this.checked = [];
  };

  CheckboxRadio.prototype.setOption = function(option) {
    var option = option.replace(new RegExp("/", "g"), "");

    if (this.checked.indexOf(option) !== -1 || !(option in this.children)) {
      return;
    }

    $(this.children[option]).children("label").removeClass(this.classOff)
      .addClass(this.classOn);

    if (this.isHorizontal) {
      $(this.children[option]).children("label").addClass("ui-btn-active");
    }

    this.checked.push(option);
  };

  CheckboxRadio.prototype.clearOption = function(option) {
    var option = option.replace(new RegExp("/", "g"), "");

    if (this.checked.indexOf(option) === -1 || !(option in this.children)) {
      return;
    }

    $(this.children[option]).children("label").removeClass(this.classOn)
      .removeClass("ui-btn-active").addClass(this.classOff);

    this.checked.splice(this.checked.indexOf(option), 1);
  };

  CheckboxRadio.prototype.onCheck = function(target) {
    var option = $(target).text().replace(new RegExp("/", "g"), "");

    if (this.checked.indexOf(option) === -1) {
      this.setOption(option);
    } else {
      this.clearOption(option);
    }

    if (this.onChangeHandler) {
      this.onChangeHandler(option);
    }
  };

  CheckboxRadio.prototype.onRadio = function(target) {
    var option = $(target).text().replace(new RegExp("/", "g"), "");

    if (this.checked.indexOf(option) !== -1 || !(option in this.children)) {
      return;
    }

    this.reset();

    this.setOption(option);

    if (this.onChangeHandler) {
      this.onChangeHandler(option);
    }
  };

  function TextArea(parent) {
    var self = this;

    this.element = document.createElement("textarea");
    this.element.className =
      "ui-input-text ui-shadow-inset ui-body-inherit ui-corner-all ui-textinput-autogrow";

    var name;

    do {
      name = util.randomString(6, true);
    } while (inputNames.indexOf(name) !== -1);

    inputNames.push(name);

    this.element.name = name;

    $(this.element).on("input", function() {
      self.autogrow();
    });

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  TextArea.prototype.val = function(val) {
    if (typeof val === "string") {
      $(this.element).val(val);

      var self = this;

      window.setTimeout(function() {
        self.autogrow();
      }, 0);
    } else {
      return $(this.element).val();
    }
  };

  TextArea.prototype.autogrow = function() {
    $(this.element).height("auto");
    $(this.element).height($(this.element).prop("scrollHeight"));
  };

  function SelectValue(type, parent) {
    var self = this;

    this.onUpHandler = null;
    this.onDisplayHandler = null;
    this.onDownHandler = null;

    this.element = document.createElement("div");

    var controlGroup = new ControlGroup(type === "horizontal", false, true);

    this.element.appendChild(controlGroup.element);

    button(
      "Up",
      "ui-btn ui-corner-all ui-icon-plus ui-btn-icon-notext ui-mini ui-first-child",
      controlGroup.controls,
      function() {
        if (self.onUpHandler) {
          self.onUpHandler();
        }
      });

    this.btnDisplay = button("Display", "ui-btn ui-corner-all ui-mini",
      controlGroup.controls,
      function() {
        if (self.onDisplayHandler) {
          self.onDisplayHandler();
        }
      });

    button(
      "Down",
      "ui-btn ui-corner-all ui-icon-minus ui-btn-icon-notext ui-mini ui-last-child",
      controlGroup.controls,
      function() {
        if (self.onDownHandler) {
          self.onDownHandler();
        }
      });

    if (parent) {
      parent.appendChild(this.element);
    }
  }

  SelectValue.prototype.display = function(text) {
    if (typeof text === "string") {
      $(this.btnDisplay).text(text);
    } else {
      return $(this.btnDisplay).text();
    }
  };

  // Prototype: SelectMenu
  function SelectMenu(options, mini, parentPopup, parentBtn) {
    Popup.call(this, parentPopup, true);

    var self = this;
    this.children = {};
    this.selection = "";
    this.onChangeHandler = null;
    this.changed = false;

    var listview = new Listview(false);
    listview.element.style.minWidth = "200px";

    this.append(listview.element);

    for (var i = 0; i < options.length; i++) {
      var item = button(options[i], "ui-btn", null, function() {
        self.onItemClick(this);
      });

      this.children[options[i]] = item;

      listview.insertItem(item);
    }

    this.button = button(options[0],
      "ui-btn ui-corner-all ui-icon-carat-d ui-btn-icon-right ui-shadow" +
      (mini ? " ui-mini" : ""), parentBtn,
      function() {
        self.show(this);
      });

    this.afterClose = function() {
      if (!self.changed) {
        return;
      }

      self.changed = false;

      return self.onChangeHandler ? self.onChangeHandler(self.selection) :
        undefined;
    };
  }

  SelectMenu.prototype = Object.create(Popup.prototype);

  SelectMenu.prototype.constructor = SelectMenu;

  SelectMenu.prototype.onItemClick = function(target) {
    var option = $(target).text();

    if ((option in this.children) && option !== this.selection) {
      this.select(option);
      this.changed = true;
    }

    this.close();
  };

  SelectMenu.prototype.select = function(option) {
    if (!(option in this.children) || this.selection === option) {
      return;
    }

    for (var i in this.children) {
      if (i === option) {
        $(this.children[i]).addClass("ui-btn-active");
      } else {
        $(this.children[i]).removeClass("ui-btn-active");
      }
    }

    this.selection = option;
    this.button.textContent = option;
  };

  SelectMenu.prototype.disabled = function(disabled) {
    if (typeof disabled === "boolean") {
      if (disabled) {
        $(this.button).addClass("ui-state-disabled");
      } else {
        $(this.button).removeClass("ui-state-disabled");
      }
    } else {
      $(this.button).addClass("ui-state-disabled");
    }
  };

  function createField(parent, elements) {
    var div = document.createElement("div");
    div.className = "ui-field-contain";

    if (parent) {
      parent.appendChild(div);
    }

    if (elements) {
      for (var i = 0; i < elements.length; i++) {
        div.appendChild(elements[i]);
      }
    }

    return div;
  }

  function createLabel(text, htmlFor, parent) {
    var label = document.createElement("label");
    label.appendChild(document.createTextNode(text));

    if (htmlFor) {
      label.htmlFor = htmlFor;
    }

    if (parent) {
      parent.appendChild(label);
    }

    return label;
  }

  function createGridB(gridBlocks) {
    var grid = document.createElement("div");
    grid.className = "ui-grid-b";

    for (var i = 0; i < gridBlocks.length; i++) {
      var div = document.createElement("div");
      grid.appendChild(div);

      div.className = "ui-block-" + ["a", "b", "c"][i];

      div.appendChild(gridBlocks[i]);
    }

    return grid;
  }

  return {
    "activePopup": activePopup,
    "onClick": onClick,
    "button": button,
    "loader": loader,
    "Page": Page,
    "Dialog": Dialog,
    "Popup": Popup,
    "PopupDialog": PopupDialog,
    "PopupPassword": PopupPassword,
    "PopupNavigate": PopupNavigate,
    "PopupGear": PopupGear,
    "DateNavigator": DateNavigator,
    "Listview": Listview,
    "InputText": InputText,
    "FlipSwitch": FlipSwitch,
    "ControlGroup": ControlGroup,
    "CheckboxRadio": CheckboxRadio,
    "TextArea": TextArea,
    "SelectValue": SelectValue,
    "SelectMenu": SelectMenu,
    "createField": createField,
    "createLabel": createLabel,
    "createGridB": createGridB
  };
}());
