export interface SimpleResultCallback<T> {
    (error?: Error, data?: T): void;
}
export interface Connection {
    query(script: string, callback: SimpleResultCallback<any[]>): any;
}
export interface DbUpgraderOptions {
    scripts_dir: string;
    conn: Connection;
    settings_table: string;
    version_record_key: string;
}
export declare class DbUpgrader {
    private scripts_dir;
    private conn;
    private settings_table;
    private version_record_key;
    /** Simple constructor */
    constructor(options: DbUpgraderOptions);
    /** Internal logging utility method */
    private log(s);
    /** Sequentially executes upgrade files. */
    run(callback: any): void;
}
