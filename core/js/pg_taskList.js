var pg_taskList = (function() {
  var page = null;
  var popupNavigate = null;
  var popupGear = null;

  var currentView = "";
  var updated = 0;

  var selectMenu = null;
  var listview = null;

  var stats = {
    "totalTasks": 0
  };

  function listItemOnClick() {
    var task = storage.task($(this).attr("data-task-id"));
    if (!task) {
      return;
    }

    if (!task.scheduled) {
      return;
    }

    var today = new XDate().clearTime().getTime();
    var closest = new XDate(task.start).clearTime().getTime();
    var dates = util.rangeToDates(task.start, task.end);

    for (var i = 0; i < dates.length; i++) {
      if (Math.abs(dates[i] - today) < Math.abs(closest - today)) {
        closest = dates[i];
      }
    }

    pg_day.setDate(closest);
    session.navigate("pg_day");
  }

  function listItemOnEdit() {
    dg_edit.preloadTask($(this).attr("data-task-id"));
    session.navigate("dg_edit");
  }

  function listItem(taskID, info) {
    var task = storage.task(taskID);
    if (!task) {
      return;
    }

    var el;

    var button = widget.button("", "ui-btn", null, listItemOnClick, true);
    button.setAttribute("data-task-id", taskID);

    var isComplete = false;

    if (task.scheduled) {
      var dates = util.rangeToDates(task.start, task.end);

      var completed = 0;

      for (var i = 0; i < dates.length; i++) {
        if (util.contains(task.history, dates[i])) {
          completed++;
        }
      }

      if (completed === dates.length) {
        isComplete = true;
      }
    }

    el = document.createElement("img");
    button.appendChild(el);
    el.className = "ui-li-icon ui-corner-none";
    el.style.margin = 0;
    el.src = compat.C("IMG_SRC") +
      (task.scheduled ? (isComplete ? "check-green.svg" : "clock-black.svg") :
        "star-black.svg");

    el = document.createElement("h2");
    el.className = "task-title";
    el.className += (task.scheduled && isComplete) ? " check" : "";
    el.textContent = task.title;
    button.appendChild(el);

    if (info) {
      var infoTxt = "";

      switch (info) {
        case "date":
          if (task.scheduled) {
            infoTxt = util.dateToStr(task.start);

            if (task.end !== task.start) {
              infoTxt += "&rarr;" + util.dateToStr(task.end);
            }

            if (task.time) {
              var time = util.strToTime(task.time);
              infoTxt += " " + util.timeToStr(time.hours, time.minutes);
            }

            if (isComplete) {
              infoTxt += " | <em>Completed</em>";
            }
          }
          break;
        case "created":
          infoTxt = util.dateToStr(task.created);
          break;
      }

      if (infoTxt) {
        el = document.createElement("p");
        el.className = "task-subtitle";
        el.className += (task.scheduled && isComplete) ? " check" : "";
        el.innerHTML = infoTxt;

        button.appendChild(el);
      }
    }

    return button;
  }

  function viewCreated() {
    stats.totalTasks = 0;

    listview.empty();

    var byCreated = tasks.sortByCreated();

    for (var i = 0; i < byCreated.length; i++) {
      var taskID = byCreated[i]["id"];

      stats.totalTasks++;

      // First half of split button
      var btnFirst = listItem(taskID, "created");

      // Second half of split button
      var btnSecond = widget
        .button("Edit task",
          "ui-btn ui-btn-icon-notext ui-icon-edit ui-btn-a", null,
          listItemOnEdit);
      btnSecond.setAttribute("data-task-id", taskID);

      listview.insertItem(btnFirst, btnSecond);
    }
  }

  function viewCategory() {
    stats.totalTasks = 0;

    listview.empty();

    var byCategory = tasks.byCategory();
    var seen = [];

    for (var i = 0; i < byCategory.length; i++) {
      var taskID = byCategory[i]["id"];
      var category = byCategory[i]["category"] ? byCategory[i]["category"] :
        "-";

      if (seen.indexOf(category) === -1) {
        listview.insertDivider(category);
        seen.push(category);
      }

      stats.totalTasks++;

      // First half of split button
      var btnFirst = listItem(taskID, "date");

      // Second half of split button
      var btnSecond = widget
        .button("Edit task",
          "ui-btn ui-btn-icon-notext ui-icon-edit ui-btn-a", null,
          listItemOnEdit);
      btnSecond.setAttribute("data-task-id", taskID);

      listview.insertItem(btnFirst, btnSecond);
    }
  }

  function viewScheduled() {
    stats.totalTasks = 0;

    listview.empty();

    var byScheduled = tasks.byScheduled();
    var seen = [];

    for (var i = 0; i < byScheduled.length; i++) {
      var taskID = byScheduled[i]["id"];
      var scheduled = byScheduled[i]["scheduled"];

      if (seen.indexOf(scheduled) === -1) {
        listview.insertDivider(scheduled ? "Yes" : "No");
        seen.push(scheduled);
      }

      // First half of split button
      var btnFirst = listItem(taskID, "date");

      // Second half of split button
      var btnSecond = widget
        .button("Edit task",
          "ui-btn ui-btn-icon-notext ui-icon-edit ui-btn-a", null,
          listItemOnEdit);
      btnSecond.setAttribute("data-task-id", taskID);

      listview.insertItem(btnFirst, btnSecond);
      stats.totalTasks++;
    }
  }

  function viewName() {
    stats.totalTasks = 0;

    listview.empty();

    var byTitle = tasks.sortTitle();

    for (var i = 0; i < byTitle.length; i++) {
      var taskID = byTitle[i]["id"];

      // First half of split button
      var btnFirst = listItem(taskID, "date");

      // Second half of split button
      var btnSecond = widget
        .button("Edit task",
          "ui-btn ui-btn-icon-notext ui-icon-edit ui-btn-a", null,
          listItemOnEdit);
      btnSecond.setAttribute("data-task-id", taskID);

      listview.insertItem(btnFirst, btnSecond);

      stats.totalTasks++;
    }
  }

  function updateView(view) {
    switch (view) {
      case "Title":
        viewName();
        break;
      case "Scheduled":
        viewScheduled();
        break;
      case "Category":
        viewCategory();
        break;
      case "Created":
        viewCreated();
        break;
      default:
        return;
    }

    page.footerHtml("Total: " + stats.totalTasks);

    currentView = view;
    storage.view("taskList_view", view);
    updated = new Date().getTime();
  }

  function _hide() {

  }

  function _done() {
    page.refresh();
    $(page.element).focus();
  }

  function _show() {
    if (!currentView) {
      currentView = storage.view("taskList_view");
      selectMenu.select(currentView);
    }

    page.navText("Task list");

    if (updated && updated >= session.status("storageModified")) {
      return;
    }

    updateView(currentView);
  }

  function _init() {
    page = new widget.Page("pg_taskList", document.body);

    popupNavigate = new widget.PopupNavigate(page.element);

    page.onNavigate = function() {
      popupNavigate.show(this);
    };

    popupGear = new widget.PopupGear(page.element);

    page.onGear = function() {
      popupGear.show(this);
    };

    // Create "New task" button
    widget.button("New task",
      "ui-btn ui-btn-icon-left ui-icon-plus ui-corner-all ui-shadow",
      page.content,
      function() {
        session.navigate("dg_edit");
      });

    // Create select view menu
    selectMenu = new widget.SelectMenu(["Title", "Category", "Scheduled",
      "Created"
    ], true, page.element, page.content);
    selectMenu.button.style.margin = "1em 0 1em 0";
    selectMenu.onChangeHandler = updateView;

    // Create listview for task items
    listview = new widget.Listview(true);
    page.append(listview.element);
  }

  return {
    "_init": _init,
    "_show": _show,
    "_done": _done,
    "_hide": _hide
  };
}());
