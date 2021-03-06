import * as async from "async";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

import * as qtopology from "./qtopology";

/////////////////////////////////////////////////////////////////////////

/**
 * Internal class for storing data about upgrade-script file.
 */
class FileRec {
    public file: string;
    public file_short: string;
    public ver: number;
}

/**
 * Simple callback.
 */
export type SimpleResultCallback<T> = (error?: Error, data?: T) => void;

/**
 * Database connection.
 */
export interface IConnection {
    query(script: string, callback: SimpleResultCallback<any[]>);
}

/**
 * Simple callback.
 */
export interface IGlob {
    sync(path: string): string[];
}

/**
 * Simple callback.
 */
export interface IFs {
    readFileSync(name: string, encoding: string): string;
}

/**
 * Options for automatic DB upgrade
 */
export interface IDbUpgraderOptions {
    scripts_dir: string;
    conn: IConnection;
    settings_table: string;
    version_record_key: string;
    log_prefix?: string;
    glob?: IGlob;
    fs?: IFs;
    use_init_script?: boolean;
    init_script_name?: string;
    sql_template_get?: string;
    sql_template_update?: string;
}

/**
 * This class handles automatic upgrades of underlaying database.
 */
export class DbUpgrader {

    private scripts_dir: string;
    private conn: IConnection;
    private settings_table: string;
    private version_record_key: string;
    private inner_glob: IGlob;
    private inner_fs: IFs;
    private log_prefix: string;
    private init_script_name: string;
    private use_init_script: boolean;
    private sql_template_update: string;
    private sql_template_get: string;

    private curr_version: number;
    private files: FileRec[];

    /** Simple constructor */
    constructor(options: IDbUpgraderOptions) {
        this.scripts_dir = options.scripts_dir;
        this.conn = options.conn;
        this.settings_table = options.settings_table || "Settings";
        this.version_record_key = options.version_record_key || "dbver";
        this.inner_glob = options.glob || glob;
        this.inner_fs = options.fs || fs;
        this.log_prefix = options.log_prefix || "[qtopology-mysql DbUpgrader] ";
        this.init_script_name = options.init_script_name || "init.sql";
        this.use_init_script = true;
        if (options.use_init_script != undefined) {
            this.use_init_script = options.use_init_script;
        }
        this.sql_template_get = options.sql_template_get ||
            "select value from ${tab} where name = '${key}';";
        this.sql_template_update = options.sql_template_update ||
            "update ${tab} set value = '${ver}' where name = '${key}';";

        this.curr_version = -1;
        this.files = [];
    }

    /** This method just checks if database version is in sync with code version. */
    public check(callback: qtopology.SimpleCallback) {
        const self = this;

        async.series(
            [
                xcallback => {
                    self.getCurrentVersionFromDb(xcallback);
                },
                xcallback => {
                    self.checkFilesInScriptsDir(xcallback);
                },
                xcallback => {
                    self.log("Finished.");
                    if (self.files.length == 0) {
                        return xcallback(new Error("Directory with SQL version upgrades is empty."));
                    }
                    const code_version = self.files[self.files.length - 1].ver;
                    if (code_version != self.curr_version) {
                        return xcallback(new Error(
                            `Version mismatch in QTopology SQL: ${self.curr_version} in db, ${code_version}`));
                    }
                    xcallback();
                }
            ], callback);
    }

    /** Sequentially executes upgrade files. */
    public run(callback: qtopology.SimpleCallback) {
        const self = this;

        async.series(
            [
                xcallback => {
                    self.runInitScript(xcallback);
                },
                xcallback => {
                    self.checkFilesInScriptsDir(xcallback);
                },
                xcallback => {
                    self.getCurrentVersionFromDb(xcallback);
                },
                xcallback => {
                    self.log("Detecting applicable upgrade files...");
                    self.files = self.files.filter(x => x.ver > self.curr_version);
                    self.files = self.files.sort((a, b) => a.ver - b.ver);

                    self.log("Number of applicable upgrade files: " + self.files.length);
                    async.eachSeries(
                        self.files,
                        (item: FileRec, xxcallback) => {
                            self.log("Executing upgrade file: " + item.file_short);
                            const script = this.inner_fs.readFileSync(item.file, "utf8");
                            self.conn.query(script, err => {
                                if (err) {
                                    console.log(err);
                                    return xxcallback(err);
                                }
                                self.updateVersionInDb(item.ver, xxcallback);
                            });
                        },
                        xcallback);
                }, xcallback => {
                    self.log("Finished.");
                    xcallback();
                }
            ], callback);
    }

    /** Internal logging utility method */
    private log(s: string) {
        qtopology.logger().debug(this.log_prefix + s);
    }

    private runInitScript(callback: qtopology.SimpleCallback) {
        const self = this;

        if (!self.use_init_script) {
            return callback();
        }
        self.log("Executing upgrade file: " + self.init_script_name);
        const fname = path.join(self.scripts_dir, self.init_script_name);
        const script = this.inner_fs.readFileSync(fname, "utf8");
        self.conn.query(script, callback);
    }

    private getCurrentVersionFromDb(callback: qtopology.SimpleCallback) {
        const self = this;
        self.log("Fetching version from database...");
        const script = self.sql_template_get
            .replace("${tab}", self.settings_table)
            .replace("${key}", self.version_record_key);
        self.conn.query(script, (err, rows) => {
            if (err) { return callback(err); }
            if (rows.length > 0) {
                self.curr_version = rows[0].value;
            }
            self.log("Current version: " + self.curr_version);
            callback();
        });
    }

    private checkFilesInScriptsDir(xcallback: qtopology.SimpleCallback) {
        const self = this;
        self.log("Checking files in script directory: " + self.scripts_dir);
        const file_names = this.inner_glob.sync(path.join(self.scripts_dir, "v*.sql"));
        const xfiles: FileRec[] = file_names.map(x => {
            const r = new FileRec();
            r.file = x;
            r.file_short = path.basename(x);
            return r;
        });
        xfiles.forEach(x => {
            const tmp = path.basename(x.file);
            x.ver = +(tmp.replace("v", "").replace(".sql", ""));
        });
        xfiles.sort((a, b) => a.ver - b.ver);
        self.files = xfiles;
        xcallback();
    }

    private updateVersionInDb(ver: number, callback: qtopology.SimpleCallback) {
        const self = this;
        self.log("Updating version in db to " + ver);
        const script = self.sql_template_update
            .replace("${ver}", "" + ver)
            .replace("${tab}", self.settings_table)
            .replace("${key}", self.version_record_key);
        self.conn.query(script, callback);
    }
}
