"use strict";

let async = require('async');
let fs = require('fs');
let mysql = require('mysql');

let logger = require('qtopology').logger();
logger.setLevel("debug");

class SchemaExporter {

    /** Simple constructor */
    constructor(options) {
        this.output_dir = options.output_dir;
        this.conn = options.conn;
    }

    /** Simple function that deletes files from given directory. */
    deleteFilesFromDir(dirPath, removeSelf) {
        if (removeSelf === undefined) {
            removeSelf = true;
        }
        let files;
        try {
            files = fs.readdirSync(dirPath);
        } catch (e) { return; }
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var filePath = dirPath + '/' + files[i];
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                } else {
                    this.deleteFilesFromDir(filePath, true);
                }
            }
        }
        if (removeSelf) {
            fs.rmdirSync(dirPath);
        }
    }

    /** Sequentially executes steps to extract SQL schema. */
    run(callback) {
        let self = this;
        let tables = [];
        let views = [];
        let procs = [];

        async.series(
            [
                (xcallback) => {
                    logger.debug("Cleaning output directory: " + self.output_dir);
                    self.deleteFilesFromDir(self.output_dir, false);
                    xcallback();
                },
                (xcallback) => {
                    logger.debug("Fetching list of tables from database...");
                    let script = "show full tables;";
                    self.conn.query(script, (err, rows) => {
                        if (err) return xcallback(err);
                        if (rows.length > 0) {
                            for (let row of rows) {
                                for (let i in row) {
                                    if (row.Table_type == "VIEW") {
                                        views.push(row[i]);
                                    } else {
                                        tables.push(row[i]);
                                    }
                                    break;
                                }
                            }
                        }
                        logger.info("Tables count: " + tables.length);
                        xcallback();
                    });
                },
                (xcallback) => {
                    logger.debug("Fetching list of procedures from database...");
                    let script = "SHOW PROCEDURE STATUS;";
                    self.conn.query(script, (err, rows) => {
                        if (err) return xcallback(err);
                        if (rows.length > 0) {
                            for (let row of rows) {
                                procs.push(row.Name);
                            }
                        }
                        logger.info("Procedures count: " + procs.length);
                        xcallback();
                    });
                },
                (xcallback) => {
                    logger.debug("Fetching table definitions...");
                    async.eachLimit(tables, 5, (x, xxcallback) => {
                        let script = "SHOW CREATE TABLE " + x + ";";
                        self.conn.query(script, (err, rows) => {
                            if (err) return xxcallback(err);
                            if (rows.length > 0) {
                                let row = rows[0];
                                let sql = row["Create Table"];
                                sql = sql.replace(/AUTO_INCREMENT=(\d*)/i, "");
                                sql = sql.replace(/DEFINER=`(\w*)`@`(\S+)`/i, "");
                                sql = sql.replace(/  DEFAULT/i, " DEFAULT");
                                fs.writeFileSync(self.output_dir + '/' + x + ".sql", sql, 'utf8');
                                logger.debug("Processed table: " + x);
                            }
                            xxcallback();
                        });

                    }, xcallback);
                },
                (xcallback) => {
                    logger.debug("Fetching view definitions...");
                    async.eachLimit(views, 5, (x, xxcallback) => {
                        let script = "SHOW CREATE VIEW " + x + ";";
                        self.conn.query(script, (err, rows) => {
                            if (err) return xxcallback(err);
                            if (rows.length > 0) {
                                let row = rows[0];
                                let sql = row["Create View"];
                                sql = sql.replace(/AUTO_INCREMENT=(\d*)/i, "");
                                sql = sql.replace(/DEFINER=`(\w*)`@`(\S+)`/i, "");
                                sql = sql.replace(/ALGORITHM=(\w*) /i, "");
                                sql = sql.replace(/DEFINER /i, "");
                                sql = sql.replace(/  DEFAULT/i, " DEFAULT");
                                sql = sql.replace(/SQL SECURITY/i, "");
                                sql = sql.replace(/`/i, "");
                                //sql = sql.replace(/AS (\w*),/i, "");

                                fs.writeFileSync(self.output_dir + '/' + x + ".sql", sql, 'utf8');
                                logger.debug("Processed view: " + x);
                            }
                            xxcallback();
                        });

                    }, xcallback);
                },
                (xcallback) => {
                    logger.debug("Fetching procedure definitions...");
                    async.eachLimit(procs, 5, (x, xxcallback) => {
                        let script = "SHOW CREATE PROCEDURE " + x + ";";
                        self.conn.query(script, (err, rows) => {
                            if (err) return xxcallback(err);
                            if (rows.length > 0) {
                                let row = rows[0];
                                let sql = row["Create Procedure"];
                                sql = sql.replace(/DEFINER=`(\w*)`@`(\S+)`/i, "");
                                fs.writeFileSync(self.output_dir + '/' + x + ".sql", sql, 'utf8');
                                logger.debug("Processed procedure: " + x);
                            }
                            xxcallback();
                        });

                    }, xcallback);
                }
            ], callback);
    }
}

///////////////////////////////////////////////////

let options = JSON.parse(fs.readFileSync("config.json"));
let pool = mysql.createPool(options);
pool.getConnection((err, conn) => {
    if (err) {
        logger.error("An error occured: " + err);
        logger.exception(err);
        return;
    }
    let schema_exporter = new SchemaExporter({ output_dir: "../export", conn: conn });
    schema_exporter.run((err) => {
        if (err) {
            logger.error("An error occured: " + err);
            logger.exception(err);
            return;
        }
        conn.release();
        pool.end();
        logger.warn("Exiting...");
        process.exit(0);
    });
});
