import * as async from "async";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

import * as qtopology from "qtopology";

/////////////////////////////////////////////////////////////////////////

/**
 * Internal class for storing data about upgrade-script file.
 */
class FileRec {
    file: string;
    file_short: string;
    ver: number;
}

/**
 * Simple callback.
 */
export interface SimpleResultCallback<T> {
    (error?: Error, data?: T): void;
}

/**
 * Database connection.
 */
export interface Connection {
    query(script: string, callback: SimpleResultCallback<any[]>);
}

/**
 * Simple callback.
 */
export interface Glob {
    sync(path: string): string[];
}

/**
 * Simple callback.
 */
export interface Fs {
    readFileSync(name: string, encoding: string): string
}

/**
 * Options for automatic DB upgrade
 */
export interface DbUpgraderOptions {
    scripts_dir: string;
    conn: Connection;
    settings_table: string;
    version_record_key: string;
    log_prefix?: string;
    glob?: Glob;
    fs?: Fs;
}

/**
 * This class handles automatic upgrades of underlaying database.
 */
export class DbUpgrader {

    private scripts_dir: string;
    private conn: Connection;
    private settings_table: string;
    private version_record_key: string;
    private inner_glob: Glob;
    private inner_fs: Fs;
    private log_prefix: string;

    private curr_version: number;
    private files: FileRec[];

    /** Simple constructor */
    constructor(options: DbUpgraderOptions) {
        this.scripts_dir = options.scripts_dir;
        this.conn = options.conn;
        this.settings_table = options.settings_table || "Settings";
        this.version_record_key = options.version_record_key || "dbver";
        this.inner_glob = options.glob || glob;
        this.inner_fs = options.fs || fs;
        this.log_prefix = options.log_prefix || "[qtopology-mysql DbUpgrader] ";

        this.curr_version = -1;
        this.files = [];
    }

    /** Internal logging utility method */
    private log(s: string) {
        qtopology.logger().debug(this.log_prefix + s);
    }

    /** This method just check's if database version is in sync with code version. */
    check(callback: qtopology.SimpleCallback) {
        let self = this;

        async.series(
            [
                (xcallback) => {
                    self.getCurrentVersionFromDb(xcallback);
                },
                (xcallback) => {
                    self.checkFilesInScriptsDir(xcallback);
                },
                (xcallback) => {
                    self.log("Finished.");
                    if (self.files.length == 0) {
                        return xcallback(new Error("Directory with SQL version upgrades is empty."));
                    }
                    let code_version = self.files[self.files.length - 1].ver;
                    if (code_version != self.curr_version) {
                        return xcallback(new Error(`Version mismatch in QTopology SQL: ${self.curr_version} in db, ${code_version}`));
                    }
                    xcallback();
                }
            ], callback);
    }

    /** Sequentially executes upgrade files. */
    run(callback: qtopology.SimpleCallback) {
        let self = this;

        async.series(
            [
                (xcallback) => {
                    let file_name = "init.sql";
                    self.log("Executing upgrade file: " + file_name);
                    let script = this.inner_fs.readFileSync(path.join(self.scripts_dir, file_name), "utf8");
                    self.conn.query(script, (err) => {
                        if (err) {
                            console.log(err);
                        }
                        xcallback(err);
                    });
                },
                (xcallback) => {
                    self.checkFilesInScriptsDir(xcallback);
                },
                (xcallback) => {
                    self.getCurrentVersionFromDb(xcallback);
                },
                (xcallback) => {
                    self.log("Detecting applicable upgrade files...");
                    self.files = self.files.filter(x => x.ver > self.curr_version);
                    self.files = self.files.sort((a, b) => { return a.ver - b.ver; });
                    xcallback();
                },
                (xcallback) => {
                    self.log("Number of applicable upgrade files: " + self.files.length);
                    async.eachSeries(
                        self.files,
                        (item: FileRec, xxcallback) => {
                            self.log("Executing upgrade file: " + item.file_short);
                            let script = this.inner_fs.readFileSync(item.file, "utf8");
                            self.conn.query(script, (err) => {
                                if (err) {
                                    console.log(err);
                                    return xxcallback(err);
                                }
                                self.updateVersionInDb(item.ver, xxcallback);
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

    private getCurrentVersionFromDb(callback: qtopology.SimpleCallback) {
        let self = this;
        self.log("Fetching version from database...");
        let script = "select value from " + self.settings_table + " where name = '" + self.version_record_key + "';";
        self.conn.query(script, (err, rows) => {
            if (err) return callback(err);
            if (rows.length > 0) {
                self.curr_version = rows[0].value;
            }
            self.log("Current version: " + self.curr_version);
            callback();
        });
    }

    private checkFilesInScriptsDir(xcallback: qtopology.SimpleCallback) {
        let self = this;
        self.log("Checking files in script directory: " + self.scripts_dir);
        let file_names = this.inner_glob.sync(path.join(self.scripts_dir, "v*.sql"));
        let xfiles: FileRec[] = file_names.map(x => {
            let r = new FileRec();
            r.file = x;
            r.file_short = path.basename(x);
            return r;
        });
        xfiles.forEach(x => {
            let tmp = path.basename(x.file);
            x.ver = +(tmp.replace("v", "").replace(".sql", ""));
        });
        xfiles.sort((a, b) => { return a.ver - b.ver; });
        self.files = xfiles;
        xcallback();
    }

    private updateVersionInDb(ver: number, callback: qtopology.SimpleCallback) {
        let self = this;
        self.log("Updating version in db to " + ver);
        let script = `update ${self.settings_table} set value = '${ver}' where name = '${self.version_record_key}'`;
        self.conn.query(script, callback);
    }
}
