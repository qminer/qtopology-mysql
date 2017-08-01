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
    private name: string;
    private options: MySqlCoordinatorParams;

    constructor(options: MySqlCoordinatorParams) {
        this.name = null; // this will be set later
        this.options = JSON.parse(JSON.stringify(options));
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
                res.push({ cmd: rec.cmd, content: JSON.parse(rec.content) });
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
    getWorkerStatus(callback: qtopology.SimpleResultCallback<qtopology.WorkerStatus[]>) {
        let self = this;
        let sql = "CALL qtopology_sp_leader_ping(?); CALL qtopology_sp_refresh_statuses();";
        self.query(sql, [self.name], (err) => {
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
                        last_ping: rec.last_ping.getTime(),
                        last_ping_d: rec.last_ping,
                        lstatus_ts: rec.lstatus_ts.getTime(),
                        lstatus_ts_d: rec.lstatus_ts
                    });
                }
                callback(null, res);
            });
        });
    }

    private getTopologyStatusInternal(sql: string, obj: any, callback: qtopology.SimpleResultCallback<qtopology.TopologyStatus[]>) {
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
                        enabled: !!rec.enabled,
                        error: rec.error,
                        worker_affinity: (rec.worker_affinity || "").split(",").filter(x => x.length > 0)
                    });
                }
                callback(null, res);
            });
        });
    }
    getTopologyStatus(callback: qtopology.SimpleResultCallback<qtopology.TopologyStatus[]>) {
        this.getTopologyStatusInternal("CALL qtopology_sp_topologies();", null, callback);
    }
    getTopologiesForWorker(name: string, callback: qtopology.SimpleResultCallback<qtopology.TopologyStatus[]>) {
        this.getTopologyStatusInternal("CALL qtopology_sp_topologies_for_worker(?);", [name], callback);
    }
    getTopologyInfo(uuid: string, callback: qtopology.SimpleResultCallback<qtopology.TopologyInfoResponse>) {
        let self = this;
        let sql = "select uuid, status, worker, weight, enabled, worker_affinity, error, config from qtopology_topology where uuid = ?;";
        self.query(sql, [uuid], (err, data) => {
            if (err) return callback(err);
            if (data.length == 0) return callback(new Error("Requested topology not found: " + uuid));
            let hit = data[0];
            let config = JSON.parse(hit.config);
            callback(null, {
                enabled: hit.enabled,
                status: hit.status,
                uuid: hit.uuid,
                error: hit.error,
                weight: hit.weight,
                worker_affinity: hit.worker_affinity,
                worker: hit.worker,
                config: config
            });
        });
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
        // this is called once at start-up and is the name of the worker that iuuses this coordination object
        // so we can save the name of the worker and use it later
        let sql = "CALL qtopology_sp_register_worker(?);";
        this.name = name;
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
    getProperties(callback: qtopology.SimpleResultCallback<qtopology.StorageProperty[]>): any {
        let res = [];
        res.push({ key: "type", value: "MySqlCoordinator" });
        res.push({ key: "host", value: this.options.host });
        res.push({ key: "database", value: this.options.database });
        res.push({ key: "port", value: this.options.port });
        res.push({ key: "user", value: this.options.user });
        res.push({ key: "multipleStatements", value: true });
        res.push({ key: "connectionLimit", value: 10 });
        callback(null, res);
    }

    sendMessageToWorker(worker: string, cmd: string, content: any, callback: qtopology.SimpleCallback) {
        let sql = "CALL qtopology_sp_send_message(?, ?, ?);";
        this.query(sql, [worker, cmd, JSON.stringify(content)], callback);
    }

    stopTopology(uuid: string, callback: qtopology.SimpleCallback) {
        let self = this;
        self.getTopologyInfo(uuid, (err, data) => {
            if (err) return callback(err);
            if (!data.worker) return callback();
            self.sendMessageToWorker(data.worker, "stop-topology", { uuid: uuid }, callback);
        });
    }

    clearTopologyError(uuid: string, callback: qtopology.SimpleCallback) {
        let self = this;
        self.getTopologyInfo(uuid, (err, data) => {
            if (err) return callback(err);
            let hit = data;
            if (hit.status != "error") {
                return callback(new Error("Specified topology is not marked as error: " + uuid));
            }
            self.setTopologyStatus(uuid, "unassigned", null, callback);
            callback();
        });
    }

    deleteWorker(name: string, callback: qtopology.SimpleCallback) {
        let self = this;
        self.getWorkerStatus((err, data) => {
            if (err) return callback(err);
            let hits = data.filter(x => x.name == name);
            if (hits.length > 0) {
                if (hits[0].status == "unloaded") {
                    self.query("CALL qtopology_sp_delete_worker(?);", [name], callback);
                } else {
                    callback(new Error("Specified worker is not unloaded and cannot be deleted."));
                }
            } else {
                callback(new Error("Specified worker doesn't exist and thus cannot be deleted."));
            }
        });
    }

    shutDownWorker(name: string, callback: qtopology.SimpleCallback) {
        this.sendMessageToWorker(name, "shutdown", {}, callback);
    }
    getTopologyHistory(uuid: string, callback: qtopology.SimpleResultCallback<qtopology.TopologyStatusHistory[]>) {
        let self = this;
        let sql = "select * from qtopology_topology_history where uuid = ? order by ts desc limit 100;";
        self.query(sql, [uuid], (err, data) => {
            if (err) return callback(err);
            let res: qtopology.TopologyStatusHistory[];
            res = [];
            data.forEach(x => {
                res.push({
                    enabled: x.enabled,
                    error: x.error,
                    status: x.status,
                    ts: x.ts,
                    uuid: x.uuid,
                    weight: x.weight,
                    worker: x.worker,
                    worker_affinity: x.worker_affinity
                });
            });
            callback(null, data);
        });
    }
    getWorkerHistory(name: string, callback: qtopology.SimpleResultCallback<qtopology.WorkerStatusHistory[]>) {
        let self = this;
        let sql = "select * from qtopology_worker_history where name = ? order by ts desc limit 100;";
        self.query(sql, [name], (err, data) => {
            if (err) return callback(err);
            let res: qtopology.WorkerStatusHistory[];
            res = [];
            data.forEach(x => {
                res.push({
                    lstatus: x.lstatus,
                    name: x.name,
                    status: x.status,
                    ts: x.ts
                });
            });
            callback(null, data);
        });
    }
}
