const port_default = 3306;

import * as EventEmitter from "events";
import * as mysql from "mysql";
import * as async from "async";
import * as path from "path";
import * as qtopology from "qtopology";

import * as dbu from "./db_updater";

/////////////////////////////////////////////////////////////////////

export interface MySqlCoordinatorParams {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export interface MySqlTopologyManager {
    insert(uuid: string, config: any, overwrite: boolean, callback: qtopology.SimpleCallback);
}

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation for MySQL

export class MySqlCoordinator implements qtopology.CoordinationStorage {

    private pool: mysql.IPool;

    constructor(options: MySqlCoordinatorParams) {
        this.pool = mysql.createPool({
            database: options.database,
            host: options.host,
            user: options.user,
            password: options.password,
            port: options.port || port_default,
            multipleStatements: true,
            connectionLimit: 10
        });
    }

    init(callback: qtopology.SimpleCallback) {
        this.pool.getConnection((err, conn) => {
            if (err) return callback(err);
            let db_upgrader = new dbu.DbUpgrader({
                conn: conn,
                scripts_dir: path.join(__dirname, "/../db"),
                settings_table: "qtopology_settings",
                version_record_key: "db_version"
            });
            db_upgrader.run(callback);
        });
    }

    close(callback: qtopology.SimpleCallback) {
        callback = callback || function () { };
        if (this.pool) {
            this.pool.end(callback);
        } else {
            callback();
        }
    }

    private log(s) {
        qtopology.logger().debug("[MySqlCoordinator] " + s);
    }

    private query(sql: string, obj: any, callback: qtopology.SimpleResultCallback<any>) {
        try {
            this.log(`${sql} ${obj}`);
            this.pool.query(sql, obj || [], callback);
        } catch (e) {
            callback(e);
        }
    }

    getMessages(name: string, callback: qtopology.SimpleResultCallback<qtopology.StorageResultMessage[]>) {
        let sql = "CALL qtopology_sp_messages_for_worker(?);";
        let self = this;
        self.query(sql, [name], (err, data) => {
            if (err) return callback(err);
            let res = [];
            let ids_to_delete = [];
            for (let rec of data[0]) {
                res.push({ cmd: rec.cmd, content: rec.content });
                ids_to_delete.push(rec.id);
            }
            async.each(
                ids_to_delete,
                (item, xcallback) => {
                    let sql2 = "CALL qtopology_sp_delete_message(?);";
                    self.query(sql2, [item], xcallback);
                },
                (err: Error) => {
                    callback(err, res);
                });
        });
    }
    getWorkerStatus(callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultWorkerStatus[]>) {
        let self = this;
        let sql = "CALL qtopology_sp_refresh_statuses();";
        self.query(sql, null, (err) => {
            if (err) return callback(err);
            sql = "CALL qtopology_sp_workers();";
            self.query(sql, null, (err, data) => {
                if (err) return callback(err);
                let res = [];
                for (let rec of data[0]) {
                    rec.last_ping = rec.last_ping || new Date();
                    rec.lstatus_ts = rec.lstatus_ts || new Date();
                    res.push({
                        name: rec.name,
                        status: rec.status,
                        lstatus: rec.lstatus,
                        last_ping_d: rec.last_ping.getTime(),
                        last_ping: rec.last_ping,
                        lstatus_ts: rec.lstatus_ts.getTime(),
                        lstatus_ts_d: rec.lstatus_ts
                    });
                }
                callback(null, res);
            });
        });
    }

    private getTopologyStatusInternal(sql: string, obj: any, callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultTopologyStatus[]>) {
        let self = this;
        let xsql = "CALL qtopology_sp_refresh_statuses();";
        self.query(xsql, null, (err) => {
            if (err) return callback(err);
            self.query(sql, obj, (err, data) => {
                if (err) return callback(err);
                let res = [];
                for (let rec of data[0]) {
                    res.push({
                        uuid: rec.uuid,
                        status: rec.status,
                        worker: rec.worker,
                        weight: rec.weight,
                        worker_affinity: (rec.worker_affinity || "").split(",").filter(x => x.length > 0)
                    });
                }
                callback(null, res);
            });
        });
    }
    getTopologyStatus(callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultTopologyStatus[]>) {
        this.getTopologyStatusInternal("CALL qtopology_sp_topologies();", null, callback);
    }
    getTopologiesForWorker(name: string, callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultTopologyStatus[]>) {
        this.getTopologyStatusInternal("CALL qtopology_sp_topologies_for_worker(?);", [name], callback);
    }
    getLeadershipStatus(callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultStatus>) {
        let self = this;
        let sql = "CALL qtopology_sp_refresh_statuses();";
        self.query(sql, null, (err) => {
            if (err) return callback(err);
            sql = "CALL qtopology_sp_worker_statuses();";
            self.query(sql, null, (err, data) => {
                if (err) return callback(err);
                data = data[0];
                let hits = data.filter(x => x.lstatus == "leader");
                if (hits.length > 0 && hits[0].cnt > 0) return callback(null, { leadership: "ok" });

                hits = data.filter(x => x.lstatus == "candidate");
                if (hits.length > 0 && hits[0].cnt > 0) return callback(null, { leadership: "pending" });

                callback(null, { leadership: "vacant" });
            });
        });
    }
    registerWorker(name: string, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_register_worker(?);";
        this.query(sql, [name], callback);
    }
    announceLeaderCandidacy(name: string, callback: qtopology.SimpleCallback) {
        let self = this;
        let sql = "CALL qtopology_sp_disable_defunct_leaders();";
        self.query(sql, null, (err) => {
            if (err) return callback(err);
            let sql = "CALL qtopology_sp_announce_leader_candidacy(?);";
            self.query(sql, [name], callback);
        });
    }
    checkLeaderCandidacy(name: string, callback: qtopology.SimpleResultCallback<boolean>) {
        let self = this;
        let sql = "CALL qtopology_sp_check_leader_candidacy(?);";
        self.query(sql, [name], (err, data) => {
            if (err) return callback(err);
            callback(null, data && data.length > 0 && data[0].length > 0 && data[0][0].status == "leader");
        });
    }
    assignTopology(uuid: string, name: string, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_assign_topology(?, ?);";
        this.query(sql, [uuid, name], callback);
    }
    setTopologyStatus(uuid: string, status: string, error: string, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_update_topology_status(?, ?, ?);";
        this.query(sql, [uuid, status, error], callback);
    }
    setWorkerStatus(name: string, status: string, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_update_worker_status(?, ?);";
        this.query(sql, [name, status], callback);
    }

    registerTopology(uuid: string, config: any, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_register_topology(?, ?, ?, ?);";
        let affinity = "";
        if (config.general.worker_affinity) {
            affinity = config.general.worker_affinity.join(",");
        }
        let weight = config.general.weight || 1;
        this.query(
            sql,
            [uuid, JSON.stringify(config), weight, affinity],
            callback);
    }
    disableTopology(uuid: string, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_disable_topology(?);";
        this.query(sql, [uuid], callback);
    }
    enableTopology(uuid: string, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_enable_topology(?);";
        this.query(sql, [uuid], callback);
    }
    deleteTopology(uuid: string, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_delete_topology(?);";
        this.query(sql, [uuid], callback);
    }
}
