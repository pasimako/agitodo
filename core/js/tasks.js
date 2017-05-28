var tasks = (function() {
  ID_LENGTH = 6;

  function historyToString(id) {
    var str = "";

    var task = storage.task(id);
    if (!task) {
      return str;
    }

    var history = task.history;
    if (history.length === 0) {
      return str;
    }

    history.sort(function(a, b) {
      return a - b;
    });

    var sequential = 0;
    for (var i = 0; i < history.length; i++) {
      var isLast = (i === history.length - 1);
      var thisEntry = new XDate(history[i]).clearTime();
      var prevEntry = (i > 0) ? new XDate(history[i - 1]).clearTime() :
        thisEntry;

      if (prevEntry.diffDays(thisEntry) === 1) {
        sequential++;

        if (isLast) {
          str += "&rarr;" + thisEntry.toString("d MMM yyyy") + " (" +
            (sequential + 1) + ")";
          sequential = 0;
        }
      } else {
        if (sequential) {
          str += "&rarr;" + prevEntry.toString("d MMM yyyy") + " (" +
            (sequential + 1) + ")";
          sequential = 0;
        }

        if (str) {
          str += "<br>";
        }
        str += thisEntry.toString("d MMM yyyy");
      }
    }

    return str;
  }

  function getName(title) {
    title = title.toLowerCase()
    var ids = storage.getTaskIDs();
    for (var i = 0; i < ids.length; i++) {
      var task = storage.task(ids[i]);
      if (task["title"].toLowerCase() === title) {
        return task;
      }
    }
  }

  function allCategories() {
    var results = [];

    var ids = storage.getTaskIDs();
    for (var i = 0; i < ids.length; i++) {
      var task = storage.task(ids[i]);

      if (task["category"] && !util.contains(results, task["category"])) {
        results.push(task["category"]);
      }
    }

    // Sort results by title
    results.sort(function(a, b) {
      var txtA = a.toLowerCase();
      var txtB = b.toLowerCase();
      return (txtA === txtB) ? 0 : (txtA > txtB) ? 1 : -1;
    });

    return results;
  }

  function sortTitle(scheduled, startDate, endDate) {
    var results = [];

    if (startDate) {
      var start = new XDate(startDate).getTime();
    }

    if (endDate) {
      var end = new XDate(endDate).getTime();
    }

    // Limit results by scheduled/date
    var ids = storage.getTaskIDs();
    for (var i = 0; i < ids.length; i++) {
      var task = storage.task(ids[i]);

      if (typeof scheduled === "boolean" && task["scheduled"] !== scheduled) {
        continue;
      }

      var thisStart = new XDate(task.start).clearTime();
      var thisEnd = new XDate(task.end).clearTime();

      if (task.days.length) {
        while (thisStart.getTime() < thisEnd.getTime()) {
          if (task.days.indexOf(thisStart.getDay()) > -1) {
            break;
          }
          thisStart.addDays(1);
        }

        while (thisEnd.getTime() > thisStart.getTime()) {
          if (task.days.indexOf(thisEnd.getDay()) > -1) {
            break;
          }
          thisEnd.addDays(-1);
        }

        if (task.days.indexOf(thisStart.getDay()) === -1 &&
          task.days.indexOf(thisEnd.getDay()) === -1) {
          thisStart = null;
          thisEnd = null;
        }
      }

      if (start && (!thisEnd || thisEnd.getTime() < start)) {
        continue;
      }
      if (end && (!thisStart || thisStart.getTime() > end)) {
        continue;
      }

      results.push(task);
    }

    // Sort results by title
    results.sort(function(a, b) {
      var txtA = a["title"].toLowerCase();
      var txtB = b["title"].toLowerCase();
      return (txtA === txtB) ? 0 : (txtA > txtB) ? 1 : -1;
    });

    return results;
  }

  function sortDate(scheduled, startDate, endDate) {
    var results = {};

    if (startDate) {
      var start = new XDate(startDate).getTime();
    }

    if (endDate) {
      var end = new XDate(endDate).getTime();
    }

    var filter = sortTitle(scheduled, startDate, endDate);

    for (var i = 0; i < filter.length; i++) {
      var task = filter[i];

      var taskStart = (start && task["start"] < start) ? start : task[
        "start"];
      var taskEnd = (end && task["end"] > end) ? end : task["end"];

      var ptr = new XDate(taskStart);
      var total = ptr.diffDays(taskEnd) + 1;

      for (var j = 0; j < total; j++) {
        var date = ptr.getTime();

        if (task.days.length === 0 || task.days.indexOf(ptr.getDay()) > -1) {
          if (!results.hasOwnProperty(date)) {
            results[date] = [];
          }
          results[date].push(task);
        }

        ptr.addDays(1);
      }
    }

    // Sort results by time
    for (var i in results) {
      results[i]
        .sort(function(a, b) {
          if (a["time"] === b["time"]) {
            return 0;
          } else if (!a["time"]) {
            return 1;
          } else if (!b["time"]) {
            return -1;
          }

          var timeA = util.strToTime(a["time"]);
          var timeB = util.strToTime(b["time"]);

          return (timeA.hours > timeB.hours || (timeA.hours === timeB.hours &&
              timeA.minutes > timeB.minutes)) ?
            1 : -1;
        });
    }

    return results;
  }

  function byCategory(scheduled, startDate, endDate) {
    var results = sortTitle(scheduled, startDate, endDate);

    // Sort results by category
    results.sort(function(a, b) {
      var txtA = a["category"].toLowerCase();
      var txtB = b["category"].toLowerCase();
      return (txtA === txtB) ? 0 : (txtA) ? ((txtB && txtA > txtB) ? 1 :
          -1) :
        1;
    });

    return results;
  }

  function sortByCreated(scheduled, startDate, endDate) {
    var results = sortTitle(scheduled, startDate, endDate);

    // Sort results by time created (most recent first)
    results.sort(function(a, b) {
      return b["created"] - a["created"];
    });

    return results;
  }

  function byScheduled(scheduled, startDate, endDate) {
    var results = sortTitle(scheduled, startDate, endDate);

    // Sort results by scheduled
    results.sort(function(a, b) {
      return (a["scheduled"] === b["scheduled"]) ? 0 :
        (a["scheduled"] ? -1 : 1);
    });

    return results;
  }

  function byDateCompleted(startDate, endDate) {
    var results = {};

    if (startDate) {
      var start = new XDate(startDate).getTime();
    }

    if (endDate) {
      var end = new XDate(endDate).getTime();
    }

    // Arrange results by completion date
    var ids = storage.getTaskIDs();
    for (var i = 0; i < ids.length; i++) {
      var task = storage.task(ids[i]);
      for (var j = 0; j < task["history"].length; j++) {
        var t = task["history"][j];
        if (start && t < start) {
          continue;
        }
        if (end && t > end) {
          continue;
        }
        if (!results.hasOwnProperty(t)) {
          results[t] = [];
        }
        results[t].push(task);
      }
    }

    // Sort results by title
    for (var i in results) {
      results[i].sort(function(a, b) {
        var txtA = a["title"].toLowerCase();
        var txtB = b["title"].toLowerCase();
        return (txtA === txtB) ? 0 : (txtA > txtB) ? 1 : -1;
      });
    }

    return results;
  }

  function filterCompleted(sort) {
    var results = [];
    // Filter results by history
    var ids = storage.getTaskIDs();
    for (var i = 0; i < ids.length; i++) {
      var task = storage.task(ids[i]);
      if (task["history"].length === 0) {
        continue;
      }
      results.push(task);
    }
    // Sort results by title
    results.sort(function(a, b) {
      var txtA = a["title"].toLowerCase();
      var txtB = b["title"].toLowerCase();
      return (txtA === txtB) ? 0 : (txtA > txtB) ? 1 : -1;
    });
    // Sort results by date
    if (sort && sort === "date") {
      results.sort(function(a, b) {
        var maxA = Math.max.apply(null, a["history"]);
        var maxB = Math.max.apply(null, b["history"]);
        return (maxA === maxB) ? 0 : (maxA > maxB) ? -1 : 1;
      });
    }
    return results;
  }

  function remove(id) {
    if (!storage.task(id)) {
      return;
    }
    storage.removeTask(id);
  }

  function update(id, data) {
    var task = storage.task(id);
    if (!task) {
      return;
    }

    for (var i in data) {
      if ((i in task) && typeof task[i] === typeof data[i]) {
        task[i] = data[i];
      }
    }

    storage.task(id, task);

    return true;
  }

  function add(data) {
    if (!util.isObject(data)) {
      return;
    }

    var id = ("id" in data) ? data["id"] : "";
    if (!id) {
      do {
        id = util.randomString(ID_LENGTH, true);
      } while (storage.task(id));
      data["id"] = id;
    }

    var task = storage.task(id, data); // Create new task merging default
    // values with data
    if (!task) {
      return;
    }

    return task["id"];
  }

  return {
    "getId": function(id) {
      return storage.task(id);
    },
    "allCategories": allCategories,
    "sortTitle": sortTitle,
    "byCategory": byCategory,
    "sortByCreated": sortByCreated,
    "byScheduled": byScheduled,
    "sortDate": sortDate,
    "byDateCompleted": byDateCompleted,
    "filterCompleted": filterCompleted,
    "add": add,
    "update": update,
    "remove": remove,
    "historyToString": historyToString
  };
}());
