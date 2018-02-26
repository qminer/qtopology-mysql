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
    query(script: string, callback: SimpleResultCallback<any[]>): any;
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
    readFileSync(name: string, encoding: string): string;
}
/**
 * Options for automatic DB upgrade
 */
export interface DbUpgraderOptions {
    scripts_dir: string;
    conn: Connection;
    settings_table: string;
    version_record_key: string;
    glob?: Glob;
    fs?: Fs;
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
    /** Simple constructor */
    constructor(options: DbUpgraderOptions);
    /** Internal logging utility method */
    private log(s);
    /** This method just check's if database version is in sync with code version. */
    check(callback: any): void;
    /** Sequentially executes upgrade files. */
    run(callback: any): void;
}
