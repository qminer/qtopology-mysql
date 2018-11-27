import * as qtopology from "./qtopology";
/**
 * Simple callback.
 */
export declare type SimpleResultCallback<T> = (error?: Error, data?: T) => void;
/**
 * Database connection.
 */
export interface IConnection {
    query(script: string, callback: SimpleResultCallback<any[]>): any;
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
export declare class DbUpgrader {
    private scripts_dir;
    private conn;
    private settings_table;
    private version_record_key;
    private inner_glob;
    private inner_fs;
    private log_prefix;
    private init_script_name;
    private use_init_script;
    private sql_template_update;
    private sql_template_get;
    private curr_version;
    private files;
    /** Simple constructor */
    constructor(options: IDbUpgraderOptions);
    /** This method just checks if database version is in sync with code version. */
    check(callback: qtopology.SimpleCallback): void;
    /** Sequentially executes upgrade files. */
    run(callback: qtopology.SimpleCallback): void;
    /** Internal logging utility method */
    private log;
    private runInitScript;
    private getCurrentVersionFromDb;
    private checkFilesInScriptsDir;
    private updateVersionInDb;
}
