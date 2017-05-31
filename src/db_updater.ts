import * as os from "os";
import * as async from "async";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

import * as qtopology from "qtopology";

/////////////////////////////////////////////////////////////////////////

class FileRec {
    file: string;
    file_short: string;
    ver: number;
}

export interface SimpleResultCallback<T> {
    (error?: Error, data?: T): void;
}

interface Connection {
    query(script: string, callback: SimpleResultCallback<any[]>);
}

export interface DbUpgraderOptions {
    scripts_dir: string;
    conn: Connection;
    settings_table: string;
    version_record_key: string;
}

export class DbUpgrader {

    private scripts_dir: string;
    private conn: Connection;
    private settings_table: string;
    private version_record_key: string;

    /** Simple constructor */
    constructor(options: DbUpgraderOptions) {
        this.scripts_dir = options.scripts_dir;
        this.conn = options.conn;
        this.settings_table = options.settings_table || "Settings";
        this.version_record_key = options.version_record_key || "dbver";
    }

    /** Internal logging utility method */
    private log(s: string) {
        qtopology.logger().debug("[qtopology-mysql DbUpgrader] " + s);
    }

    /** Sequentially executes upgrade files. */
    run(callback) {
        let self = this;
        let files = [];
        let xfiles = [];
        let curr_version = -1;

        async.series(
            [
                (xcallback) => {
                    let file_name = "init.sql";
                    self.log("Executing upgrade file: " + file_name);
                    let script = fs.readFileSync(path.join(self.scripts_dir, file_name), "utf8");
                    self.conn.query(script, (err) => {
                        if (err) {
                            console.log(err);
                        }
                        xcallback(err);
                    });
                },
                (xcallback) => {
                    self.log("Fetching files in script directory: " + self.scripts_dir);
                    files = glob.sync(self.scripts_dir + "/v*.sql");
                    let xfiles = files.map(x => {
                        let r = new FileRec();
                        r.file = x;
                        r.file_short = path.basename(x);
                        return r
                    });
                    xfiles.forEach(x => {
                        let tmp = path.basename(x.file);
                        x.ver = +(tmp.replace("v", "").replace(".sql", ""));
                    });
                    xfiles.sort((a, b) => { return a.ver - b.ver; });
                    files = xfiles;
                    xcallback();
                },
                (xcallback) => {
                    self.log("Fetching version from database...");
                    let script = "select name, value from " + self.settings_table + " where name = '" + self.version_record_key + "';";
                    self.conn.query(script, function (err, rows) {
                        if (err) return xcallback(err);
                        if (rows.length > 0) {
                            curr_version = rows[0].value;
                        }
                        self.log("Current version: " + curr_version);
                        xcallback();
                    });
                },
                (xcallback) => {
                    self.log("Detecting applicable upgrade files...");
                    files = files.filter(x => x.ver > curr_version);
                    files = files.sort((a, b) => { return a.ver - b.ver; });
                    xcallback();
                },
                (xcallback) => {
                    self.log("Number of applicable upgrade files: " + files.length);
                    async.eachSeries(
                        files,
                        (item: FileRec, xxcallback) => {
                            self.log("Executing upgrade file: " + item.file_short);
                            let script = fs.readFileSync(item.file, "utf8");
                            self.conn.query(script, (err) => {
                                if (err) {
                                    console.log(err);
                                    return xxcallback(err);
                                }
                                self.log("Updating version in db to " + item.ver);
                                let script2 = `update ${self.settings_table} set value = '${item.ver}' where name = '${self.version_record_key}'`;
                                self.conn.query(script2, xxcallback);
                            });
                        },
                        xcallback);
                },
                (xcallback) => {
                    self.log("Finished.");
                    xcallback();
                }
            ], callback);
    }
}
