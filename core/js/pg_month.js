var pg_month = (function() {
  var page = null;
  var popupNavigate = null;
  var popupGear = null;
  var dateNav = null;

  var table = {
    element: null,
    tbody: null,
    rows: 0,
    cells: []
  };

  var currentDate = new XDate().setDate(1).clearTime().getTime();
  var updated = 0;

  var stats = {
    "totalTasks": 0,
    "completedTasks": 0
  };

  var popupSummary = (function() {
    var obj = null;
    var listview = null;

    var active = false;
    var activeCell = null;

    var timeOpen = null;

    function onMousemove(event) {
      if (!active || !activeCell) {
        return;
      }

      var pointerY = event.pageY;
      var pointerX = event.pageX;

      var offsetCell = $(activeCell).offset();
      var topCell = offsetCell.top;
      var leftCell = offsetCell.left;
      var bottomCell = offsetCell.top + $(activeCell).height();
      var rightCell = offsetCell.left + $(activeCell).width();

      var offsetPopup = $(obj.element).offset();
      var topPopup = offsetPopup.top;
      var leftPopup = offsetPopup.left;
      var bottomPopup = offsetPopup.top + $(obj.element).height();
      var rightPopup = offsetPopup.left + $(obj.element).width();

      if (topPopup - pointerY > 1 || pointerY - bottomPopup > 1 ||
        leftPopup - pointerX > 1 || pointerX - rightPopup > 1) {
        if (topCell - pointerY > 1 || pointerY - bottomCell > 1 ||
          leftCell - pointerX > 1 || pointerX - rightCell > 1) {
          obj.close();
        }
      }
    }

    function beforeChange() {
      if (!active || !timeOpen) {
        return false;
      }

      return (new Date().getTime() - timeOpen) > 100;
    }

    function onNavigate() {
      if (!beforeChange()) {
        return;
      }

      pg_day.setDate(parseInt($(this).attr("data-date"), 10));
      session.navigate("pg_day");
    }

    function onChange(itemChecked, date) {
      cell.update(activeCell);
      updateFooter(itemChecked, date);
    }

    function close() {
      obj.close();
    }

    function show(target) {
      if (activeCell === target) {
        return;
      }

      if (active) {
        close();
      }

      activeCell = target;

      var taskList = $(target).attr("data-ids");
      taskList = taskList ? taskList.split(",") : [];

      var date = parseInt($(target).attr("data-date"), 10);
      var xdate = new XDate(date);

      // Pending
      var pending = 0;

      for (var i = 0; i < taskList.length; i++) {
        var task = tasks.getId(taskList[i]);

        if (!util.contains(task.history, xdate.getTime())) {
          pending++;
        }
      }

      listview.empty();

      // Divider
      var divider = listview.insertDivider(util
        .dateToStr(xdate.getTime(), true), xdate.diffDays(new XDate()
          .clearTime()) === 0, pending);
      divider.style.textAlign = "center";
      divider.setAttribute("data-date", xdate.getTime());
      widget.onClick(divider, onNavigate);

      // Tasks
      for (var i = 0; i < taskList.length; i++) {
        listview.insertTask(taskList[i], xdate.getTime(), onChange,
          beforeChange);
      }

      obj.show(target);
    }

    function init(parent) {
      obj = new widget.Popup(parent, true);

      active = false;
      activeCell = null;

      listview = new widget.Listview(false);
      obj.append(listview.element);

      obj.afterOpen = function() {
        active = true;
        timeOpen = new Date().getTime();
      };

      obj.beforeDismiss = function(pageX, pageY) {
        var offset = $(table.element).offset();

        if (pageY >= offset.top &&
          pageY <= (offset.top + $(table.element).height()) &&
          pageX >= offset.left &&
          pageX <= (offset.left + $(table.element).width())) {
          return false;
        }
      };

      obj.afterClose = function() {
        activeCell = null;
        active = false;
      };
    }

    return {
      "init": init,
      "show": show,
      "close": close,
      "onMousemove": onMousemove,
      "isActive": function() {
        return active;
      }
    };
  }());

  var cell = (function() {
    var dimensions = {
      height: 0,
      minHeight: 0,
      border: 0,
      tdPadding: 0,
      textTop: 0,
      textLeft: 0,
      textMinWidth: 0,
      textHeight: 0,
      textPadding: 0,
      calc: function() {
        if (!table.tbody || !table.cells.length) {
          return;
        }

        var offsetTbody = $(table.tbody).offset();
        var offsetFooter = $(page.footer).offset();

        var uiPadding = parseFloat($(page.content).css(
            "padding-bottom")
          .replace(/[^-\d\.]/g, "")) + 2; // +2px slack

        if (!this.tdPadding) {
          this.tdPadding = parseFloat($(table.tbody).find("td").first()
            .css(
              "padding-top").replace(/[^-\d\.]/g, ""));
        }

        if (!this.textTop && table.cells.length > 0) {
          this.textTop = $(table.cells[0]).children(".cell-header")
            .first()
            .outerHeight(true); // Including padding & margin
        }

        if (!this.border && !this.minHeight && !this.padding &&
          table.cells.length > 0) {
          this.border = parseFloat($(table.cells[0]).css(
              "border-top-width")
            .replace(/[^-\d\.]/g, ""));
          this.minHeight = parseFloat($(table.cells[0]).css(
              "min-height")
            .replace(/[^-\d\.]/g, ""));
        }

        var height = (offsetFooter.top - offsetTbody.top -
            uiPadding - (table.rows * (2 * this.tdPadding + 2 *
              this.border))) /
          table.rows;

        this.height = (height > this.minHeight) ? height : this.minHeight;

        if (!this.textHeight && !this.textMinWidth && !this.textPadding &&
          !this.textLeft && table.cells.length > 0) {

          var properties = util.getClassProperty(
            "cell-task task-text", [
              "height", "min-width", "padding-top",
              "border-top-width",
              "padding-left", "margin-bottom", "left"
            ], table.cells[0]);

          this.textMinWidth = parseFloat(properties["min-width"].replace(
            /[^-\d\.]/g, ""));
          this.textHeight = parseFloat(properties["height"].replace(
              /[^-\d\.]/g, "")) +
            2 *
            parseFloat(properties["padding-top"].replace(
              /[^-\d\.]/g, "")) +
            2 *
            parseFloat(properties["border-top-width"]
              .replace(/[^-\d\.]/g, "")) +
            parseFloat(properties["margin-bottom"].replace(
              /[^-\d\.]/g, ""));
          this.textPadding = parseFloat(properties["padding-left"].replace(
              /[^-\d\.]/g, "")) +
            parseFloat(properties["border-top-width"]
              .replace(/[^-\d\.]/g, ""));
          this.textLeft = parseFloat(properties["left"]
            .replace(/[^-\d\.]/g, ""));
        }

        return this;
      }
    };

    function update(element) {
      $(element).height(dimensions.height).children("span").remove();

      var taskList = $(element).attr("data-ids");

      if (!taskList) {
        return;
      }

      taskList = taskList.split(",");

      var date = parseInt($(element).attr("data-date"), 10);

      var pendingTasks = 0;

      for (var i = 0; i < taskList.length; i++) {
        var task = tasks.getId(taskList[i]);

        if (task.history.indexOf(date) === -1) {
          pendingTasks++;
        }
      }

      var width = $(element).width() - 2 * dimensions.textPadding - 2 *
        dimensions.textLeft;
      var top = dimensions.textTop;

      if (pendingTasks > 0) {
        var color = (new XDate().clearTime().diffDays(date) >= 0) ?
          "blue" :
          "red";

        if (width >= dimensions.textMinWidth &&
          (top + (pendingTasks * dimensions.textHeight) <= dimensions.height)
        ) {
          for (var i = 0; i < taskList.length; i++) {
            var task = tasks.getId(taskList[i]);

            if (task.history.indexOf(date) !== -1) {
              continue;
            }

            var span = document.createElement("span");
            span.className =
              "cell-task task-text ui-corner-all ui-shadow " +
              color;
            span.style.width = width + "px";
            span.style.top = top + "px";

            var time = util.strToTime(task.time);
            var timeTxt = time ? util.timeToStr(time.hours, time.minutes) :
              "";

            span.textContent = timeTxt ? timeTxt + " " + task.title :
              task.title;

            $(element).append(span);

            top += dimensions.textHeight;
          }
        } else {
          var span = document.createElement("span");
          span.className =
            "cell-task task-counter ui-corner-all ui-shadow " +
            color;
          span.textContent = pendingTasks;
          $(element).append(span);
        }
      } else {
        var span = document.createElement("span");
        span.className = "cell-task task-check ui-corner-all ui-shadow";
        $(element).append(span);
      }
    }

    function onNavigate() {
      if (popupSummary.isActive()) {
        return popupSummary.close();
      }

      pg_day.setDate(parseInt($(this).attr("data-date"), 10));
      session.navigate("pg_day");
    }

    function onPopup(event) {
      if (event.type === "mouseenter" && global.isTouchDevice()) {
        return;
      }

      popupSummary.show(this);
    }

    function create(date, taskList, light, parent) {
      var element = document.createElement("div");

      if (parent) {
        parent.appendChild(element);
      }

      element.className =
        "ui-btn ui-btn-a ui-corner-all ui-shadow month-cell";

      if (light) {
        element.className += " cell-light";
      }

      if (new XDate().clearTime().diffDays(date) === 0) {
        element.className += " highlight";
      }

      var header = document.createElement("p");
      header.className = "cell-header";

      if (new XDate().clearTime().diffDays(date) === 0) {
        header.className += " ui-btn ui-btn-active";
      }

      header.textContent = new Date(date).getDate();

      element.appendChild(header);

      element.setAttribute("data-date", new Date(date).getTime());
      element.setAttribute("data-ids", taskList.join(","));

      widget.onClick(element, taskList.length ? onPopup : onNavigate,
        true);

      if (taskList.length && !global.isTouchDevice()) {
        $(element).on("mouseenter", onPopup);
      }

      return element;
    }

    return {
      "dimensions": dimensions,
      "create": create,
      "update": update
    };
  }());

  function updateFooter(itemChecked, date) {
    if (typeof itemChecked === "boolean" &&
      new XDate(date).getMonth() === new XDate(currentDate).getMonth()) {
      stats.completedTasks = itemChecked ? (stats.completedTasks + 1) :
        (stats.completedTasks - 1);
    }

    page.footerHtml("Total: " + stats.totalTasks + ", Completed: " +
      stats.completedTasks);
  }

  function viewMonth(date) {
    stats.totalTasks = 0;
    stats.completedTasks = 0;

    $(table.element).empty();
    table.tbody = null;
    table.rows = 0;
    table.cells = [];

    cell.dimensions.height = 0;

    var weekStarts = (storage.settings("weekStarts") === "Sun") ? 0 : 1;

    var startDate = new XDate(date).setDate(1).clearTime();
    var endDate = new XDate(startDate).addDays(XDate.getDaysInMonth(
      startDate
      .getFullYear(), startDate.getMonth()) - 1);

    var thisMonth = startDate.getMonth();

    // Fill cell gaps with days form previous/next month
    startDate.addDays(-1 * (((startDate.getDay() - weekStarts) + 7) % 7));
    endDate.addDays(((weekStarts + 6) - endDate.getDay()) % 7);

    var byDate = tasks.sortDate(true, startDate.toDate(), endDate.toDate());

    var tr, th, td;
    var thisDay = startDate,
      isThisMonth;

    // Create table header
    var thead = document.createElement("thead");

    tr = document.createElement("tr");

    for (var i = 0; i < 7; i++) {
      th = document.createElement("th");

      var el = document.createElement("div");
      el.className = "ui-bar-a ui-corner-all";
      // el.className = "ui-body ui-body-a ui-corner-all";
      el.textContent = new XDate(startDate).addDays(i).toString("ddd");

      th.appendChild(el);
      tr.appendChild(th);
    }

    thead.appendChild(tr);

    table.element.appendChild(thead);

    // Create table body
    var tbody = document.createElement("tbody");

    table.tbody = tbody;

    while (thisDay.getTime() <= endDate.getTime()) {
      tr = document.createElement("tr");

      for (var i = 0; i < 7; i++) {
        isThisMonth = (thisDay.getMonth() === thisMonth);

        td = document.createElement("td");

        var taskList = [];

        if (thisDay.getTime() in byDate) {
          var tasksThisDay = byDate[thisDay.getTime()];

          for (var j = 0; j < tasksThisDay.length; j++) {
            var task = tasksThisDay[j];

            taskList.push(task["id"]);

            if (isThisMonth) {
              stats.totalTasks++;
              if (task["history"].indexOf(thisDay.getTime()) !== -1) {
                stats.completedTasks++;
              }
            }
          }
        }

        var thisCell = cell.create(thisDay.getTime(), taskList, !
          isThisMonth,
          td);

        table.cells.push(thisCell);

        thisDay.addDays(1);

        tr.appendChild(td);
      }

      table.rows++;

      tbody.appendChild(tr);
    }

    table.element.appendChild(tbody);
  }

  function updateView(offset) {
    var offset = (typeof offset === "number") ? offset : null;

    if (typeof offset === "number") {
      currentDate = (offset === 0) ? new XDate().setDate(1).clearTime()
        .getTime() : new XDate(currentDate).setDate(1).clearTime().addMonths(
          offset).getTime();
    }

    page.navText(new XDate(currentDate).toString("MMMM yyyy"));

    if (offset === null && updated &&
      updated >= session.status("storageModified")) {
      return;
    }

    widget.activePopup.close();

    viewMonth(currentDate);

    updateFooter();

    updated = new Date().getTime();
  }

  function onResize() {
    if (session.status("currentPage") !== "pg_month") {
      cell.dimensions.height = 0;
      return;
    }

    var dim = cell.dimensions.calc();

    if (!dim) {
      return;
    }

    for (var i = 0; i < table.cells.length; i++) {
      cell.update(table.cells[i]);
    }
  }

  function onMousemove(event) {
    if (session.status("currentPage") !== "pg_month" || global.isTouchDevice()) {
      return;
    }

    popupSummary.onMousemove(event.originalEvent);
  }

  function _hide() {

  }

  function _done() {
    if (!cell.dimensions.height) {
      onResize();
    }

    page.refresh();

    $(page.element).focus();
  }

  function _show() {
    updateView();
  }

  function _init() {
    page = new widget.Page("pg_month", document.body);

    popupNavigate = new widget.PopupNavigate(page.element);

    page.onNavigate = function() {
      popupNavigate.show(this);
    };

    popupGear = new widget.PopupGear(page.element);

    page.onGear = function() {
      popupGear.show(this);
    };

    dateNav = new widget.DateNavigator(page.content, function(offset) {
      updateView(offset);
      if (!cell.dimensions.height) {
        onResize();
      }
    });

    // Create month table
    table.element = document.createElement("table");
    table.element.className = "month-table";

    page.append(table.element);

    // Create task summary popup
    popupSummary.init(page.element);

    // Resize event
    $(window).resize(onResize);

    // Mousemove event
    $(window).mousemove(onMousemove);
  }

  return {
    "_init": _init,
    "_show": _show,
    "_done": _done,
    "_hide": _hide,
    "setDate": function(to) {
      var to = new XDate(to).setDate(1).clearTime().getTime();
      if (to === currentDate) {
        return;
      }
      currentDate = to;
      updated = 0;
    }
  };
}());
