var mysql = require("mysql");

var logger = require("./logger");

var pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  database: "agitodo",
  user: "agitodo",
  password: "PASSWORD",
  charset: "utf8_bin",
  connectionLimit: 4
});

function logError(err) {
  logger.error(err);
}

function execute(template, values, stream, callback) {
  pool.getConnection(function(err, connection) {
    if (err) {
      logError(err);
      return callback ? callback(err) : undefined;
    }

    values = values ? values : [];

    console.log(template + " , " + values);

    var result = [];
    var error = null;
    var query = connection.query(template, values);

    query.on("error", function(err) {
      // Handle error, an "end" event will be emitted after this as well
      logError(err);
      error = err;
    }).on("fields", function(fields) {
      // the field packets for the rows to follow
    }).on("result", function(row) {
      if (stream) {
        return callback ? callback(error, row) : undefined;
      }
      result.push(row);
    }).on("end", function() {
      connection.release();
      return callback ? callback(error, stream ? undefined : result) :
        undefined;
    });
  });
}

function valueToSql(value) {
  if (typeof value === "object" && value !== null) {
    if (Object.prototype.toString.call(value) === "[object Date]") {
      value = value.toISOString();
    } else {
      value = JSON.stringify(value);
    }
  }

  return value;
}

function objToSql(dict, join) {
  var placeholders = [];
  var values = [];

  for (var k in dict) {
    placeholders.push(k + " = ?");
    values.push(valueToSql(dict[k]));
  }

  return {
    sql: placeholders.join(join ? join : ""),
    values: values
  }
}

function update(table, setColumns, conditions, callback) {
  if (!setColumns) {
    return callback ? callback() : undefined;
  }

  var sql = "UPDATE `" + table + "`";
  var s = objToSql(setColumns, ", ");

  sql += (" SET " + s.sql);
  var values = s.values;

  if (conditions) {
    var s = objToSql(conditions, " AND ");
    sql += (" WHERE " + s.sql);
    Array.prototype.push.apply(values, s.values);
  }

  execute(sql, values, false, callback);
}

function insert(table, setColumns, onDuplicate, callback) {
  if (!setColumns) {
    return callback ? callback() : undefined;
  }

  var sql = "INSERT INTO `" + table + "`";

  var s = objToSql(setColumns, ", ");
  sql += (" SET " + s.sql);
  var values = s.values;

  if (onDuplicate) {
    var s = objToSql(onDuplicate, ", ");
    sql += (" ON DUPLICATE KEY UPDATE " + s.sql);
    Array.prototype.push.apply(values, s.values);
  }

  execute(sql, values, false, callback);
}

function select(table, conditions, callback) {
  var sql = "SELECT * FROM `" + table + "`";
  var values = [];

  if (conditions) {
    var s = objToSql(conditions, " AND ");
    sql += (" WHERE " + s.sql);
    Array.prototype.push.apply(values, s.values);
  }

  execute(sql, values, false, callback);
}

function remove(table, conditions, callback) {
  if (!conditions) {
    return callback ? callback() : undefined;
  }

  var sql = "DELETE FROM `" + table + "`";

  var s = objToSql(conditions, " AND ");
  execute(sql + " WHERE " + s.sql, s.values, false, callback);
}

module.exports = {
  "execute": execute,
  "select": select,
  "insert": insert,
  "update": update,
  "remove": remove
};
