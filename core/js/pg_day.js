var pg_day = (function() {
  var page = null;
  var popupNavigate = null;
  var popupGear = null;
  var dateNav = null;

  var listview = null;
  var footer = null;

  var currentDate = new XDate().clearTime().getTime();
  var updated = 0;

  var stats = {
    "totalTasks": 0,
    "completedTasks": 0
  };

  function updateFooter(itemChecked, date) {
    if (typeof itemChecked === "boolean") {
      stats.completedTasks = itemChecked ? (stats.completedTasks + 1) :
        (stats.completedTasks - 1);
    }

    page.footerHtml("Total: " + stats.totalTasks + ", Completed: " +
      stats.completedTasks);
  }

  function viewDay(date) {
    stats.totalTasks = 0;
    stats.completedTasks = 0;

    var taskIDs = [];

    var thisDay = new XDate(date).clearTime();

    var sorted = tasks.sortDate(true, thisDay.toDate(), thisDay.toDate());

    if (thisDay.getTime() in sorted) {
      var results = sorted[thisDay.getTime()];
      for (var i = 0; i < results.length; i++) {
        taskIDs.push(results[i]["id"]);
      }
    }

    // Pending
    var pending = 0;

    for (var i = 0; i < taskIDs.length; i++) {
      var task = tasks.getId(taskIDs[i]);

      if (!util.contains(task.history, thisDay.getTime())) {
        pending++;
      } else {
        stats.completedTasks++;
      }

      stats.totalTasks++;
    }

    listview.empty();

    // Divider
    var divider = listview.insertDivider("<small>" + thisDay.toString(
        "dddd") +
      "</small><br>" + thisDay.toString("d MMMM yyyy"), thisDay
      .diffDays(new XDate().clearTime()) === 0, pending);
    divider.style.textAlign = "center";
    divider.setAttribute("data-date", thisDay.getTime());

    for (var i = 0; i < taskIDs.length; i++) {
      listview.insertTask(taskIDs[i], thisDay.getTime(), updateFooter);
    }

    updateFooter();
  }

  function updateView(offset) {
    var offset = (typeof offset === "number") ? offset : null;

    if (typeof offset === "number") {
      currentDate = (offset === 0) ? new XDate().clearTime().getTime() :
        new XDate(currentDate).clearTime().addDays(offset).getTime();
    }

    page.navText(util.dateToStr(currentDate, true));

    if (offset === null && updated &&
      updated >= session.status("storageModified")) {
      return;
    }

    widget.activePopup.close();

    viewDay(currentDate);

    updated = new Date().getTime();
  }

  function _hide() {

  }

  function _done() {
    page.refresh();
    $(page.element).focus();
  }

  function _show() {
    updateView();
  }

  function _init() {
    page = new widget.Page("pg_day", document.body);

    // Create navigation popup
    popupNavigate = new widget.PopupNavigate(page.element);

    page.onNavigate = function() {
      popupNavigate.show(this);
    };

    // Create gear popup
    popupGear = new widget.PopupGear(page.element);

    page.onGear = function() {
      popupGear.show(this);
    };

    // Create date navigator
    dateNav = new widget.DateNavigator(page.content, updateView);

    // Create listview for day items
    listview = new widget.Listview(true);
    page.append(listview.element);

    // Create "New task" button
    widget.button("New task",
      "ui-btn ui-btn-icon-left ui-icon-plus ui-corner-all ui-shadow",
      page.content,
      function() {
        dg_edit.setDate(currentDate);
        session.navigate("dg_edit");
      });
  }

  return {
    "_init": _init,
    "_show": _show,
    "_done": _done,
    "_hide": _hide,
    "setDate": function(date) {
      if (currentDate === date) {
        return;
      }
      currentDate = date;
      updated = 0;
    }
  };
}());
