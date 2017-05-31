"use strict";

const dbu = require("../built/db_updater");
const mysql = require("mysql");

let conn = mysql.createConnection({
    host: "localhost",
    database: "xtest",
    user: "qtopology_admin",
    password: "VSAp2BJ2",
    multipleStatements: true
})

let obj = new dbu.DbUpgrader({
    scripts_dir: "../db",
    settings_table: "qtopology_settings",
    version_record_key: "db_version",
    conn: conn
});

obj.run((err) => {
    if (err) {
        console.error(err);
    }
    conn.end();
    console.log("Done.");
});
