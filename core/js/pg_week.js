var pg_week = (function() {
  var page = null;
  var popupNavigate = null;
  var popupGear = null;
  var dateNav = null;

  var container = null;

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

  function viewWeek(date) {
    stats.totalTasks = 0;
    stats.completedTasks = 0;

    $(container).empty();

    var xdate = new XDate(date).addDays(4 - new XDate(date).getDay()); // Select
    // Thursday
    // per
    // ISO
    // standard
    var week = xdate.getWeek();
    var year = xdate.getFullYear();

    var thisDay = new XDate().setWeek(week, year); // Monday at 00:00:00

    if (storage.settings("weekStarts") === "Sun") {
      thisDay.addDays(-1); // Change to Sunday
    } else {
      if (new XDate().getDay() === 0) { // If today is Sunday
        thisDay.addWeeks(-1); // Change to previous Monday
      }
    }

    var sorted = tasks.sortDate(true, thisDay.toDate(), new XDate(thisDay)
      .addDays(6).toDate());

    for (var day = 0; day < 7; day++) {
      var taskList = [];

      if (thisDay.getTime() in sorted) {
        var results = sorted[thisDay.getTime()];

        for (var i = 0; i < results.length; i++) {
          taskList.push(results[i]["id"]);
        }
      }

      // Pending
      var pending = 0;

      for (var i = 0; i < taskList.length; i++) {
        var task = tasks.getId(taskList[i]);

        if (!util.contains(task.history, thisDay.getTime())) {
          pending++;
        } else {
          stats.completedTasks++;
        }

        stats.totalTasks++;
      }

      var listview = new widget.Listview(true, container);

      // Divider
      var divider = listview.insertDivider("<small>" + thisDay.toString(
          "dddd") +
        "</small><br>" + thisDay.toString("d MMMM yyyy"), thisDay
        .diffDays(new XDate().clearTime()) === 0, pending);
      divider.style.textAlign = "center";
      divider.setAttribute("data-date", thisDay.getTime());

      widget.onClick(divider, function() {
        pg_day.setDate(parseInt($(this).attr("data-date"), 10));
        session.navigate("pg_day");
      }, true);

      // Tasks
      for (var i = 0; i < taskList.length; i++) {
        listview.insertTask(taskList[i], thisDay.getTime(), updateFooter);
      }

      thisDay.addDays(1);
    }

    updateFooter();
  }

  function updateView(offset) {
    var offset = (typeof offset === "number") ? offset : null;

    if (typeof offset === "number") {
      currentDate = (offset === 0) ? new XDate().clearTime().getTime() :
        new XDate(currentDate).clearTime().addWeeks(offset).getTime();
    }

    var xdate = new XDate(currentDate).addDays(1 - new XDate(currentDate)
      .getDay()); // Select Monday

    page.navText(xdate.toString("d MMM") + " - " +
      xdate.addDays(6).toString("d MMM yyyy"));

    if (offset === null && updated &&
      updated >= session.status("storageModified")) {
      return;
    }

    widget.activePopup.close();

    viewWeek(currentDate);

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
    page = new widget.Page("pg_week", document.body);

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

    // Create container for listviews
    container = document.createElement("div");

    page.append(container);
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
