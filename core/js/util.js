var util = (function() {
  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(
      c) {
      var r = Math.random() * 16 | 0,
        v = c == "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function hash(data) {
    var hash;

    try {
      hash = CryptoJS.SHA1(data).toString();
    } catch (e) {
      hash = "";
    }

    return hash;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function randomString(length, lowercase) {
    var result = "";
    var chars = lowercase ? "abcdefghijklmnopqrstuvwxyz0123456789" :
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  function toJson(obj) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return;
    }
  }

  function fromJson(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return;
    }
  }

  function toJsonSorted(obj) {
    if (Object.prototype.toString.call(obj) !== "[object Object]") {
      return toJson(obj);
    }

    var keys = [];

    for (var i in obj) {
      if (!obj.hasOwnProperty(i) || typeof obj[i] === "function") {
        continue;
      }
      keys.push(i);
    }

    keys.sort();

    var str = "";

    for (var i = 0; i < keys.length; i++) {
      str += (str ? "," : "") + toJson(keys[i]) + ":" + toJson(obj[keys[i]]);
    }

    return "{" + str + "}";
  }

  function clone(obj) {
    return jQuery.extend(true, {}, obj);
  }

  function contains(lst, item) {
    return lst.indexOf(item) > -1;
  }

  function startsWith(str, prefix) {
    return str.indexOf(prefix) === 0;
  }

  function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  }

  function dateToStr(date, long) {
    var format = "";

    if (long) {
      switch (storage.settings("dateFormat")) {
        case "YMD":
          format = "yyyy MMM d, ddd";
          break;
        case "MDY":
          format = "ddd, MMM d yyyy";
          break;
        default:
          format = "ddd, d MMM yyyy";
          break;
      }
    } else {
      switch (storage.settings("dateFormat")) {
        case "YMD":
          format = "yyyy-M-d";
          break;
        case "MDY":
          format = "M-d-yyyy";
          break;
        default:
          format = "d-M-yyyy";
          break;
      }
    }

    return new XDate(date).toString(format);
  }

  function strToTime(str) {
    var parts = str.split(":");
    if (typeof parts !== "object" || parts.length < 2) {
      return;
    }

    var hours = parseInt(parts[0].trim(), 10);
    var minutes = 0;

    if (util.endsWith(parts[1], "PM") || util.endsWith(parts[1], "AM")) {
      hours = (parts[1].slice(-2) === "AM") ? hours % 12 : 12 + (hours % 12);
      minutes = parseInt(parts[1].slice(0, -2).trim(), 10);
    } else {
      minutes = parseInt(parts[1].trim(), 10);
    }

    return {
      "hours": hours,
      "minutes": minutes
    };
  }

  function timeToStr(hours, minutes) {
    var usePeriod = (storage.settings("timeFormat") === "12h");

    if (usePeriod) {
      var period = (hours < 12) ? "AM" : "PM";
      hours = (hours === 0 || hours === 12) ? 12 : hours % 12;
    }

    var str = util.numToStr(hours, 1) + ":" + util.numToStr(minutes, 2);

    if (usePeriod) {
      str += " " + period;
    }

    return str;
  }

  function numToStr(num, digits) {
    var str = num.toString();

    if (digits) {
      while (str.length < digits) {
        str = "0" + str;
      }
    }

    return str;
  }

  function rangeToDates(start, end) {
    var dates = [];

    var thisDate = new XDate(start).clearTime();
    var end = new XDate(end).clearTime().getTime();

    while (thisDate.getTime() <= end) {
      dates.push(thisDate.getTime());
      thisDate.addDays(1);
    }

    return dates;
  }

  function capitalize(str) {
    return (str.length > 0) ? str.charAt(0).toUpperCase() +
      str.toLowerCase().slice(1) : str;
  }

  function byteCount(str) {
    var m = encodeURIComponent(str).match(/%[89ABab]/g);
    return str.length + (m ? m.length : 0);
  }

  function isObject(val) {
    return Object.prototype.toString.call(val) === "[object Object]";
  }

  function isArray(val) {
    return Object.prototype.toString.call(val) === "[object Array]";
  }

  function htmlEncode(text) {
    return $("<div/>").text(text).html().replace(/\n/g, "<br>");
  }

  function getClassProperty(className, properties, parent) {
    var res;

    var span = document.createElement("span");
    span.className = className;
    span.style.visibility = "hidden";

    if (parent) {
      parent.appendChild(span);
    } else {
      document.body.appendChild(span);
    }

    if (typeof properties === "string") {
      res = $(span).css(properties);
    } else if (isArray(properties)) {
      res = {};

      for (var i = 0; i < properties.length; i++) {
        res[properties[i]] = $(span).css(properties[i]);
      }
    }

    $(span).remove();

    return res;
  }

  return {
    "uuid": uuid,
    "hash": hash,
    "randomInt": randomInt,
    "randomString": randomString,
    "toJson": toJson,
    "toJsonSorted": toJsonSorted,
    "fromJson": fromJson,
    "clone": clone,
    "contains": contains,
    "startsWith": startsWith,
    "endsWith": endsWith,
    "dateToStr": dateToStr,
    "strToTime": strToTime,
    "timeToStr": timeToStr,
    "numToStr": numToStr,
    "rangeToDates": rangeToDates,
    "capitalize": capitalize,
    "byteCount": byteCount,
    "isObject": isObject,
    "isArray": isArray,
    "htmlEncode": htmlEncode,
    "getClassProperty": getClassProperty
  };
}());
