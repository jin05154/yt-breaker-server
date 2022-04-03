const mysql = require("mysql");

const mysqlConnection = {
  init: function () {
    return mysql.createPool({
      app_name: process.env.NEW_RELIC_APP_NAME,
      license_key: process.env.NEW_RELIC_LICENSE_KEY,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      charset: "utf8mb4",
    });
  },
  open: function (con) {
    con.connect((err) => {
      if (err) {
        console.log("MySQL connection error : ", err);
      } else {
        console.log("MySQL connected!");
      }
    });
  },
  close: function (con) {
    con.end((err) => {
      if (err) {
        console.log("MySQL termination error : ", err);
      } else {
        console.log("MySQL terminated...");
      }
    });
  },
};

module.exports = mysqlConnection;
