var dg_edit = (function() {
  var DAYS = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
  var DAYS_EXT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var page = null;

  var currentTask = null;
  var currentDate = null;

  var btnOptions = null;

  var fieldCreated = null;
  var fieldTitle = null;
  var fieldScheduled = null;
  var fieldCategory = null;
  var fieldStart = null;
  var fieldRepeat = null;
  var fieldEnd = null;
  var fieldDays = null;
  var fieldTime = null;
  var fieldNotes = null;

  // Prototype: FieldRepeat
  function FieldRepeat(onChange) {
    var self = this;
    this.onChange = onChange ? onChange : null;

    this.element = document.createElement("fieldset");
    this.element.className =
      "ui-controlgroup ui-controlgroup-horizontal ui-corner-all ui-mini";
    this.element.style.border = "none";

    var label = document.createElement("div");
    this.element.appendChild(label);
    label.className = "ui-controlgroup-label";

    $(label).append("<legend>Repeat:</legend>");

    var controls = document.createElement("div");
    this.element.appendChild(controls);
    controls.className = "ui-controlgroup-controls";

    widget.button("Down",
      "ui-btn ui-corner-all ui-icon-carat-d ui-btn-icon-notext ui-first-child",
      controls,
      function() {
        var value = self.value(self.value() - 1);
        if (self.onChange) {
          self.onChange(value);
        }
      });

    this.display = widget.button("1", "ui-btn ui-corner-all ui-btn-mini",
      controls,
      function() {
        var value = self.value(1);
        if (self.onChange) {
          self.onChange(value);
        }
      });

    widget.button("Up",
      "ui-btn ui-corner-all ui-icon-carat-u ui-btn-icon-notext ui-last-child",
      controls,
      function() {
        var value = self.value(self.value() + 1);
        if (self.onChange) {
          self.onChange(value);
        }
      });
  }

  FieldRepeat.prototype.value = function(value) {
    if (typeof value === "number") {
      if (value < 1) {
        value = 1;
      } else if (value > 180) {
        value = 180;
      }
      $(this.display).text(value);
    }

    return parseInt($(this.display).text(), 10);
  };

  // Popup: Email
  var popupEmail = (function() {
    var popup = null;
    var inputText = null;
    var inputRadio = null;
    var button = null;

    function createBody(data) {
      var title = data.title;
      var category = data.category;
      var date = util.dateToStr(data.start) +
        ((data.start !== data.end) ? " / " + util.dateToStr(data.end) :
          "");

      var days = [];

      for (var i = 0; i < data.days.length; i++) {
        if (typeof data.days[i] !== "number" || data.days[i] < 0 ||
          data.days[i] > 6) {
          continue;
        }
        days.push(DAYS_EXT[data.days[i]]);
      }

      var days = days.join(", ");

      var time = getFieldTime();
      var time = time ? util.timeToStr(time.hours, time.minutes) : "";

      var notes = util.htmlEncode(data.notes);

      var html =
        "<!DOCTYPE HTML><html><head><meta charset=\"utf-8\"><title>Agitodo</title><style>body{background-color:#fafafa;text-align:left}a img{vertical-align: middle;}.main{display:inline-block;text-align:center;text-shadow:0 1px 0 #fff}.field,.title,.notes{margin:1em auto;color:#e84e40;text-align:left;vertical-align:middle}.title,.notes{text-align:center}.title{display:inline-block;margin:0 0.5em;text-align:left;}.value,.notes-text{color:#000;font-weight:700;font-style:italic}.notes-text{font-size:small;text-align:left}.footer {margin: 2em auto 0 auto;padding-top: 0.5em;border-top: 1px;border-top-style: solid;font-size:small;color: black;font-style: italic;}.footer a:link, .footer a:visited {color: #e84e40;}</style></head><body><div class=\"main\"><div><a href=\"https://example.com\"><img src=\"https://example.com/img/icon-96.png\" width=\"96\" height=\"96\"></a><div class=\"title\"><div>Task</div><div class=\"value\">" +
        title +
        "</div></div></div><div class=\"field\">Category: <span class=\"value\">" +
        category +
        "</span></div><div class=\"field\">Date: <span class=\"value\">" +
        date +
        "</span></div><div class=\"field\">Days: <span class=\"value\">" +
        days +
        "</span></div><div class=\"field\">Time: <span class=\"value\">" +
        time +
        "</span></div><div class=\"notes\"><div style=\"text-decoration:underline\">Notes</div><div class=\"notes-text\">" +
        notes +
        "</div></div><div class=\"footer\"><a href=\"https://example.com\">Agitodo</a> | To-do list &amp; Calendar application.</div></div></body></html>";

      return html;
    }

    function validateEmail(email) {
      if (typeof email !== "string" || email.length < 7 || email.length >
        100) {
        return;
      }
      return new RegExp("^[^@;<>\\s]+@[^@;<>\\s]{2,}\\.[^@;<>\\s]{2,}$")
        .test(email); // a@aa.aa
    }

    function close() {
      popup.close();
    }

    function show(positionTo) {
      popup.show(positionTo);
    }

    function init(parent) {
      popup = new widget.PopupDialog(parent, false, "Email task", true);

      inputText = new widget.InputText(true);

      popup.append(inputText.element);

      inputRadio = new widget.CheckboxRadio(true, true, true, "", [
        "Default",
        "Other"
      ]);
      inputRadio.onChangeHandler = function(value) {
        if (value === "Default") {
          inputText.val(storage.settings("email_default"));
          inputText.disabled(true);
          $(button).focus();
        } else {
          inputText.disabled(false);
          $(inputText).focus();
        }
      };

      popup.append(inputRadio.element);

      button = widget
        .button(
          "Send",
          "ui-btn ui-corner-all ui-shadow ui-btn-a ui-btn-icon-left ui-icon-mail",
          null,
          function() {
            var addr = inputText.val().trim();

            if (!validateEmail(addr)) {
              return;
            }

            close();

            var data = fields();

            widget.loader("Sending email...");

            email.send(addr, compat.C("APP_NAME") + ": " + data.title,
              createBody(data),
              function(data) {
                if (data) {
                  widget.loader();
                } else {
                  widget.loader("Connection error", true, compat
                    .C("MSG_DELAY"));
                }
              });
          });

      popup.append(button);

      popup.afterOpen = function() {
        $(button).focus();
      };

      popup.beforePosition = function() {
        inputRadio.reset();
        inputRadio.setOption("Default");
        inputRadio.onChangeHandler("Default");
      };
    }

    return {
      "init": init,
      "show": show,
      "close": close
    };
  }());

  // Popup: View history
  var popupViewHistory = (function() {
    var popup = null;
    var history = null;
    var button = null;

    function close() {
      popup.close();
    }

    function show(positionTo) {
      popup.show(positionTo);
    }

    function init(parent) {
      popup = new widget.PopupDialog(parent, false, "Task history",
        true);

      history = document.createElement("p");

      popup.append(history);

      popup.append(document.createElement("hr"));

      var p = document.createElement("p");
      p.style.marginBottom = "1em";
      p.textContent = "Permanently clear history?";

      popup.append(p);

      button = widget
        .button(
          "Clear",
          "ui-btn ui-corner-all ui-shadow ui-btn-a ui-btn-icon-left ui-icon-alert",
          null,
          function() {
            tasks.update(currentTask, {
              "history": []
            });
            close();
          });

      popup.append(button);

      popup.afterOpen = function() {
        $(button).focus();
      };

      popup.beforePosition = function() {
        $(history).html(
          "<small>" + tasks.historyToString(currentTask) +
          "</small>");
      };
    }

    return {
      "init": init,
      "show": show,
      "close": close
    };
  }());

  // Popup: Delete
  var popupDelete = (function() {
    var popup = null;
    var button = null;

    function close() {
      popup.close();
    }

    function show(positionTo) {
      popup.show(positionTo);
    }

    function init(parent) {
      popup = new widget.PopupDialog(parent, false, "Delete task", true);

      var p = document.createElement("p");
      p.style.marginBottom = "1em";
      p.textContent = "Permanently delete task?";

      popup.append(p);

      button = widget
        .button(
          "Delete",
          "ui-btn ui-corner-all ui-shadow ui-btn-a ui-btn-icon-left ui-icon-alert",
          null,
          function() {
            tasks.remove(currentTask);
            currentTask = null;
            currentDate = null
            close();
            session.back();
          });

      popup.append(button);
    }

    return {
      "init": init,
      "show": show,
      "close": close
    };
  }());

  // Popup: Options
  var popupOptions = (function() {
    var popup = null;
    var btnEmail = null;
    var btnHistory = null;
    var btnDelete = null;
    var nextOpen = null;

    function close() {
      popup.close();
    }

    function show(positionTo) {
      popup.show(positionTo);
    }

    function init(parent) {
      popup = new widget.Popup(parent, true);

      var listview = new widget.Listview(false);
      listview.element.style.minWidth = "200px";

      btnEmail = widget.button("Email",
        "ui-btn ui-btn-icon-left ui-icon-mail",
        null,
        function() {
          nextOpen = "email";
          popup.close();
        });

      btnHistory = widget.button("View history",
        "ui-btn ui-btn-icon-left ui-icon-eye", null,
        function() {
          nextOpen = "viewHistory";
          popup.close();
        });

      btnDelete = widget.button("Delete",
        "ui-btn ui-btn-icon-left ui-icon-delete", null,
        function() {
          nextOpen = "delete";
          popup.close();
        });

      listview.insertItem(btnEmail);
      listview.insertItem(btnHistory);
      listview.insertItem(btnDelete);

      popup.append(listview.element);

      popup.beforePosition = function() {
        if (storage.settings("email_service")) {
          $(btnEmail).removeClass("ui-state-disabled");
        } else {
          $(btnEmail).addClass("ui-state-disabled");
        }
      };

      popup.afterClose = function() {
        var open = nextOpen;
        nextOpen = null;

        switch (open) {
          case "email":
            popupEmail.show();
            break;
          case "viewHistory":
            popupViewHistory.show();
            break;
          case "delete":
            popupDelete.show();
            break;
        }
      };
    }

    return {
      "init": init,
      "show": show,
      "close": close
    };
  }());

  // Popup: Category
  var popupCategory = (function() {
    var popup = null;
    var parentInputText = null;
    var inputText = null;
    var listview = null;
    var categories = [];

    function onSelect() {
      var text = $(this).text();

      inputText.val(text);
      parentInputText.val(text);

      inputText.focus();
    }

    function fillListview(list) {
      listview.empty();

      for (var i = 0; i < list.length; i++) {
        listview.insertItem(widget.button(list[i],
          "ui-btn ui-btn-icon-right ui-icon-carat-r", null,
          onSelect));
      }
    }

    function filter(text) {
      var text = (typeof text === "string") ? text.toLowerCase() : "";

      var list = [];

      for (var i = 0; i < categories.length; i++) {
        if (text) {
          var lowercase = categories[i].toLowerCase();

          if (lowercase.indexOf(text) !== -1) {
            list.push(categories[i]);
          }
        } else {
          list.push(categories[i]);
        }
      }

      fillListview(list);
    }

    function close() {
      popup.close();
    }

    function show(positionTo) {
      popup.show(positionTo);
    }

    function init(parent, input) {
      popup = new widget.PopupDialog(parent, false, "Set category",
        true);
      parentInputText = input;

      var fieldset = document.createElement("fieldset");
      fieldset.className =
        "ui-controlgroup ui-controlgroup-vertical ui-corner-all";
      fieldset.style.border = "none";

      popup.append(fieldset);

      var controls = document.createElement("div");
      fieldset.appendChild(controls);
      controls.className = "ui-controlgroup-controls";

      inputText = new widget.InputText(false, false, false, controls);
      inputText.onInputHandler = function() {
        filter(this.val());
      };
      inputText.onEnterHandler = function() {
        var text = inputText.val();

        parentInputText.val(text);

        close();

        parentInputText.focus();
      };

      listview = new widget.Listview(true, controls);

      popup.beforePosition = function() {
        categories = tasks.allCategories();

        var text = parentInputText.val();

        inputText.val(text);
        filter(text);
      };

      popup.afterOpen = function() {
        inputText.focus();
      };

      popup.afterClose = function() {
        parentInputText.val(inputText.val());
      };

      widget.onClick(parentInputText.element, function() {
        show(this);
      });
    }

    return {
      "init": init,
      "show": show,
      "close": close
    };
  }());

  // Popup: Date
  var popupDate = (function() {
    var popup = null;
    var display = null;
    var selectDay = null;
    var selectMonth = null;
    var selectYear = null;
    var currentDate = new Date().getTime();
    var onChange = null;

    function setDate(date) {
      var xdate = new XDate(date);

      $(display).text(util.dateToStr(xdate, true));

      selectDay.display(xdate.toString("dd"));
      selectMonth.display(xdate.toString("MMM"));
      selectYear.display(xdate.toString("yyyy"));

      currentDate = xdate.getTime();

      if (onChange) {
        onChange(currentDate);
      }
    }

    function changeField(field, inc) {
      var thisDate = new XDate(currentDate);

      switch (field) {
        case "day":
          thisDate.addDays(inc);
          break;
        case "month":
          thisDate.addMonths(inc, true);
          break;
        case "year":
          thisDate.addYears(inc, true);
          break;
        default:
          return;
      }

      setDate(thisDate.getTime());
    }

    function close() {
      popup.close();
    }

    function show(date, handler, positionTo) {
      setDate(date);

      if (handler) {
        onChange = handler;
      }

      popup.show(positionTo);
    }

    function init(parent) {
      popup = new widget.PopupDialog(parent, false, "Set date", true);

      var btnToday = widget.button("Today",
        "ui-btn ui-corner-all ui-shadow",
        null,
        function() {
          setDate(new XDate().clearTime().getTime());
        });

      popup.append(btnToday);

      display = document.createElement("p");
      display.style.textAlign = "center";
      display.style.margin = "1em auto";
      display.textContent = "Wed 01 Jan 2014";

      popup.append(display);

      selectDay = new widget.SelectValue("vertical");
      selectDay.element.style.margin = "0px 2px";
      selectDay.onUpHandler = function() {
        changeField("day", 1);
      };
      selectDay.onDownHandler = function() {
        changeField("day", -1);
      };

      selectMonth = new widget.SelectValue("vertical");
      selectMonth.element.style.margin = "0px 2px";
      selectMonth.onUpHandler = function() {
        changeField("month", 1);
      };
      selectMonth.onDownHandler = function() {
        changeField("month", -1);
      };

      selectYear = new widget.SelectValue("vertical");
      selectYear.element.style.margin = "0px 2px";
      selectYear.onUpHandler = function() {
        changeField("year", 1);
      };
      selectYear.onDownHandler = function() {
        changeField("year", -1);
      };

      var grid = widget.createGridB([selectDay.element, selectMonth.element,
        selectYear.element
      ]);
      grid.style.margin = "1em auto 0.5em auto";

      popup.append(grid);

      popup.afterClose = function() {
        onChange = null;
      };
    }

    return {
      "init": init,
      "show": show,
      "close": close
    };
  }());

  // Popup: Time
  var popupTime = (function() {
    var popup = null;
    var selectHours = null;
    var selectMinutes = null;
    var selectPeriod = null;
    var onChange = null;

    function setTime(hours, minutes, off) {
      var period = (hours < 12) ? "AM" : "PM";
      hours = (hours === 0 || hours === 12) ? 12 : hours % 12;

      if (off) {
        period = "Off";
      }

      hours = (hours < 10) ? "0" + hours.toString() : hours.toString();
      minutes = (minutes < 10) ? "0" + minutes.toString() : minutes.toString();

      selectHours.display(hours);
      selectMinutes.display(minutes);
      selectPeriod.display(period);
    }

    function changeField(field, inc) {
      var period = selectPeriod.display();

      if (field !== "period" && period === "Off") {
        return;
      }

      if (field === "period") {
        var opt = ["Off", "AM", "PM"];
        var index = opt.indexOf(period);
        index += inc;
        if (index < 0) {
          index = 2;
        } else if (index > 2) {
          index = 0;
        }
        period = opt[index];
      }

      var hours = parseInt(selectHours.display(), 10);
      var minutes = parseInt(selectMinutes.display(), 10);

      hours = (period === "PM") ? 12 + (hours % 12) : hours % 12;
      if (field === "hours") {
        hours += inc;
        if (hours < 0) {
          hours = 23;
        } else if (hours > 23) {
          hours = 0;
        }
      } else if (field === "minutes") {
        minutes += inc;
        if (minutes < 0) {
          minutes = 59;
        } else if (minutes > 59) {
          minutes = 0;
        }
      }

      setTime(hours, minutes, period === "Off");

      if (onChange) {
        onChange(hours, minutes, period === "Off");
      }
    }

    function close() {
      popup.close();
    }

    function show(hours, minutes, off, handler, positionTo) {
      setTime(hours, minutes, off);

      if (handler) {
        onChange = handler;
      }

      popup.show(positionTo);
    }

    function init(parent) {
      popup = new widget.PopupDialog(parent, false, "Set time", true);

      selectHours = new widget.SelectValue("vertical");
      selectHours.element.style.margin = "0px 2px";
      selectHours.onUpHandler = function() {
        changeField("hours", 1);
      };
      selectHours.onDownHandler = function() {
        changeField("hours", -1);
      };

      selectMinutes = new widget.SelectValue("vertical");
      selectMinutes.element.style.margin = "0px 2px";
      selectMinutes.onUpHandler = function() {
        changeField("minutes", 1);
      };
      selectMinutes.onDownHandler = function() {
        changeField("minutes", -1);
      };

      selectPeriod = new widget.SelectValue("vertical");
      selectPeriod.element.style.margin = "0px 2px";
      selectPeriod.onUpHandler = function() {
        changeField("period", 1);
      };
      selectPeriod.onDownHandler = function() {
        changeField("period", -1);
      };

      var grid = widget.createGridB([selectHours.element,
        selectMinutes.element, selectPeriod.element
      ]);
      grid.style.margin = "1em auto 0.5em auto";

      popup.append(grid);

      popup.afterClose = function() {
        onChange = null;
      };
    }

    return {
      "init": init,
      "show": show,
      "close": close
    };
  }());

  function setDateRange(start, end) {
    var start = (start) ? new XDate(start).getTime() : fieldStart.date;
    var end = (end) ? new XDate(end).getTime() : null;
    var repeat;
    if (end) {
      repeat = Math.floor(new XDate(start).diffDays(end)) + 1;
      if (repeat > 180) {
        repeat = 180;
        end = new XDate(start).addDays(repeat - 1).getTime();
      } else if (repeat < 1) {
        repeat = 1;
        start = end;
      }
    } else {
      repeat = fieldRepeat.value();
      if (!isNaN(repeat) && repeat > 0) {
        end = new XDate(start).addDays(repeat - 1).getTime();
      } else {
        end = start;
        repeat = 1;
      }
    }
    fieldStart.val(util.dateToStr(start));
    fieldStart.date = start;

    fieldRepeat.value(repeat);

    fieldEnd.val(util.dateToStr(end));
    fieldEnd.date = end;
  }

  function getFieldTime() {
    var val = fieldTime.val();
    if (val === "Off") {
      return;
    }

    return util.strToTime(val);
  }

  function setFieldTime(hours, minutes, off) {
    var period = (hours < 12) ? "AM" : "PM";
    var hours = (hours === 0 || hours === 12) ? 12 : hours % 12;

    if (off) {
      period = "Off";
    }

    var strHours = (hours < 10) ? "0" + hours.toString() : hours.toString();
    var strMinutes = (minutes < 10) ? "0" + minutes.toString() : minutes
      .toString();

    fieldTime.val((period === "Off") ? period : (strHours + ":" +
      strMinutes +
      " " + period));
  }

  function reset(data) {
    var data = data || {};

    // Field: Created
    fieldCreated
      .val(("created" in data) ? util.dateToStr(data["created"]) : "");

    // Field: Title
    fieldTitle.val(("title" in data) ? data["title"] : "");

    // Field: Scheduled
    fieldScheduled.val(("scheduled" in data) ? (data.scheduled ? "Yes" :
        "No") :
      "Yes");

    // Field: Category
    fieldCategory.val(("category" in data) ? data.category : "");

    // Field: Start
    var start = ("start" in data) ? data.start : new XDate().clearTime()
      .getTime();

    // Field: End
    var end = ("end" in data) ? data.end : start;

    setDateRange(start, end);

    // Field: Day
    fieldDays.reset();
    if ("days" in data) {
      for (var i = 0; i < data.days.length; i++) {
        if (typeof data.days[i] !== "number" || data.days[i] < 0 ||
          data.days[i] > 6) {
          continue;
        }
        fieldDays.setOption(DAYS[data.days[i]]);
      }
    }

    // Field: Time
    if (("time" in data) && data.time) {
      var time = util.strToTime(data.time);
      if (time) {
        setFieldTime(time.hours, time.minutes);
      }
    } else {
      setFieldTime(0, 0, true);
    }

    // Field: Notes
    fieldNotes.val(("notes" in data) ? data.notes : "");
  }

  function fields() {
    var data = {};

    // Field: Title
    data.title = fieldTitle.val().trim();
    if (!data.title) {
      data.title = "?";
    }

    // Field: Scheduled
    data.scheduled = (fieldScheduled.val() === "Yes") ? true : false;

    // Field: Category
    data.category = fieldCategory.val().trim();

    // Field: Start
    data.start = fieldStart.date;

    // Field: End
    data.end = fieldEnd.date;

    // Field: Days
    data.days = [];

    for (var i = 0; i < fieldDays.checked.length; i++) {
      data.days.push(DAYS.indexOf(fieldDays.checked[i]));
    }

    // Field: Time
    var time = getFieldTime();
    data.time = time ? (time.hours.toString() + ":" + time.minutes.toString()) :
      "";

    // Field: Notes
    data.notes = fieldNotes.val();

    return data;
  }

  function _hide() {

  }

  function _done() {
    if (currentTask) {
      $(page.element).focus();
    } else {
      fieldTitle.focus();
    }

    fieldNotes.autogrow();
  }

  function _show() {
    if (currentTask) {
      page.setTitle("Edit task"); // Header = "Edit Task"
      $(btnOptions).show();
      reset(tasks.getId(currentTask));
    } else {
      page.setTitle("New task"); // Header = "New Task"
      $(btnOptions).hide();
      reset(currentDate ? {
        "start": currentDate
      } : null);
    }
  }

  function _init() {
    page = new widget.Dialog("dg_edit", "", true, document.body);

    page.onClose = function() {
      currentTask = null;
      currentDate = null;
      session.back();
    };

    // Create Save button
    widget.button("Save",
      "ui-btn ui-btn-icon-left ui-icon-check ui-corner-all ui-shadow",
      page.content,
      function() {
        if (currentTask) {
          if (!tasks.update(currentTask, fields())) {
            compat.log("Failed to update task");
            return;
          }
        } else {
          if (!tasks.add(fields())) {
            compat.log("Failed to create task");
            return;
          }
        }

        currentTask = null;
        currentDate = null;
        session.back();
      });

    // Field: Created
    fieldCreated = new widget.InputText(false, true);
    widget.createField(page.content, [
      widget.createLabel("Created:", fieldCreated.input.name),
      fieldCreated.element
    ]);

    // Field: Title
    fieldTitle = new widget.InputText(true);
    widget
      .createField(page.content, [
        widget.createLabel("Title:", fieldTitle.input.name),
        fieldTitle.element
      ]);

    // Field: Scheduled
    fieldScheduled = new widget.FlipSwitch(["No", "Yes"]);
    widget.createField(page.content, [widget.createLabel("Scheduled:"),
      fieldScheduled.element
    ]);

    // Field: Category
    fieldCategory = new widget.InputText(false, false, true);
    widget.createField(page.content, [
      widget.createLabel("Category:", fieldCategory.input.name),
      fieldCategory.element
    ]);

    // Field: Start
    fieldStart = new widget.InputText(false, false, true);
    widget
      .createField(page.content, [
        widget.createLabel("Start:", fieldStart.input.name),
        fieldStart.element
      ]);

    // Field: Repeat
    fieldRepeat = new FieldRepeat(function(value) {
      setDateRange();
    });
    widget.createField(page.content, [fieldRepeat.element]);

    // Field: End
    fieldEnd = new widget.InputText(false, false, true);
    widget.createField(page.content, [
      widget.createLabel("End:", fieldEnd.input.name), fieldEnd.element
    ]);

    // Field: Days
    fieldDays = new widget.CheckboxRadio(false, true, true, "Days:", ["M",
      "Tu", "W", "Th", "F", "Sa", "Su"
    ]);
    widget.createField(page.content, [fieldDays.element]);

    // Field: Time
    fieldTime = new widget.InputText(false, false, true);
    widget.createField(page.content, [
      widget.createLabel("Time:", fieldTime.input.name), fieldTime.element
    ]);

    // Field: Notes
    fieldNotes = new widget.TextArea();
    widget.createField(page.content, [widget.createLabel("Notes:",
        fieldNotes.element.name),
      fieldNotes.element
    ]);

    // Popup Options
    popupOptions.init(page.element);

    // Options button
    btnOptions = widget.button("Options...",
      "ui-btn ui-corner-all ui-shadow",
      page.content,
      function() {
        if (!currentTask) {
          return;
        }
        popupOptions.show(this);
      });

    // Category popup
    popupCategory.init(page.element, fieldCategory);

    // Delete popup
    popupDelete.init(page.element);

    // View history popup
    popupViewHistory.init(page.element);

    // Email popup
    popupEmail.init(page.element);

    // Create date popup
    popupDate.init(page.element);

    widget.onClick(fieldStart.element, function() {
      popupDate.show(fieldStart.date, function(date) {
        setDateRange(date, null);
      }, this);
    });

    widget.onClick(fieldEnd.element, function() {
      popupDate.show(fieldEnd.date, function(date) {
        setDateRange(null, date);
      }, this);
    });

    // Create time popup
    popupTime.init(page.element);

    widget.onClick(fieldTime.element, function() {
      var time = getFieldTime();
      popupTime.show(time ? time.hours : 0, time ? time.minutes : 0,
        time ?
        false : true, setFieldTime, this);
    });
  }

  return {
    "_init": _init,
    "_show": _show,
    "_done": _done,
    "_hide": _hide,
    "preloadTask": function(task) {
      currentTask = (typeof task === "string") ? task : null;
    },
    "setDate": function(date) {
      currentDate = (typeof date === "number") ? date : null;
    }
  };
}());
