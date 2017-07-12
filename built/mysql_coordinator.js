"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const port_default = 3306;
const mysql = require("mysql");
const async = require("async");
const path = require("path");
const qtopology = require("qtopology");
const dbu = require("./db_updater");
//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation for MySQL
class MySqlCoordinator {
    constructor(options) {
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
    init(callback) {
        this.pool.getConnection((err, conn) => {
            if (err)
                return callback(err);
            let db_upgrader = new dbu.DbUpgrader({
                conn: conn,
                scripts_dir: path.join(__dirname, "/../db"),
                settings_table: "qtopology_settings",
                version_record_key: "db_version"
            });
            db_upgrader.run(callback);
        });
    }
    close(callback) {
        callback = callback || function () { };
        if (this.pool) {
            this.pool.end(callback);
        }
        else {
            callback();
        }
    }
    log(s) {
        qtopology.logger().debug("[MySqlCoordinator] " + s);
    }
    query(sql, obj, callback) {
        try {
            this.log(`${sql} ${obj}`);
            this.pool.query(sql, obj || [], callback);
        }
        catch (e) {
            callback(e);
        }
    }
    getMessages(name, callback) {
        let sql = "CALL qtopology_sp_messages_for_worker(?);";
        let self = this;
        self.query(sql, [name], (err, data) => {
            if (err)
                return callback(err);
            let res = [];
            let ids_to_delete = [];
            for (let rec of data[0]) {
                res.push({ cmd: rec.cmd, content: JSON.parse(rec.content) });
                ids_to_delete.push(rec.id);
            }
            async.each(ids_to_delete, (item, xcallback) => {
                let sql2 = "CALL qtopology_sp_delete_message(?);";
                self.query(sql2, [item], xcallback);
            }, (err) => {
                callback(err, res);
            });
        });
    }
    getWorkerStatus(callback) {
        let self = this;
        let sql = "CALL qtopology_sp_leader_ping(?); CALL qtopology_sp_refresh_statuses();";
        self.query(sql, [self.name], (err) => {
            if (err)
                return callback(err);
            sql = "CALL qtopology_sp_workers();";
            self.query(sql, null, (err, data) => {
                if (err)
                    return callback(err);
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
    getTopologyStatusInternal(sql, obj, callback) {
        let self = this;
        let xsql = "CALL qtopology_sp_refresh_statuses();";
        self.query(xsql, null, (err) => {
            if (err)
                return callback(err);
            self.query(sql, obj, (err, data) => {
                if (err)
                    return callback(err);
                let res = [];
                for (let rec of data[0]) {
                    res.push({
                        uuid: rec.uuid,
                        status: rec.status,
                        worker: rec.worker,
                        weight: rec.weight,
                        enabled: !!rec.enabled,
                        worker_affinity: (rec.worker_affinity || "").split(",").filter(x => x.length > 0)
                    });
                }
                callback(null, res);
            });
        });
    }
    getTopologyStatus(callback) {
        this.getTopologyStatusInternal("CALL qtopology_sp_topologies();", null, callback);
    }
    getTopologiesForWorker(name, callback) {
        this.getTopologyStatusInternal("CALL qtopology_sp_topologies_for_worker(?);", [name], callback);
    }
    getTopologyDefinition(uuid, callback) {
        let self = this;
        let sql = "select worker, config from qtopology_topology where uuid = ?;";
        self.query(sql, [uuid], (err, data) => {
            if (err)
                return callback(err);
            if (data.length == 0)
                return callback(null, null);
            let config = JSON.parse(data[0].config);
            callback(null, { current_worker: data[0].worker, config: config });
        });
    }
    getLeadershipStatus(callback) {
        let self = this;
        let sql = "CALL qtopology_sp_refresh_statuses();";
        self.query(sql, null, (err) => {
            if (err)
                return callback(err);
            sql = "CALL qtopology_sp_worker_statuses();";
            self.query(sql, null, (err, data) => {
                if (err)
                    return callback(err);
                data = data[0];
                let hits = data.filter(x => x.lstatus == "leader");
                if (hits.length > 0 && hits[0].cnt > 0)
                    return callback(null, { leadership: "ok" });
                hits = data.filter(x => x.lstatus == "candidate");
                if (hits.length > 0 && hits[0].cnt > 0)
                    return callback(null, { leadership: "pending" });
                callback(null, { leadership: "vacant" });
            });
        });
    }
    registerWorker(name, callback) {
        let sql = "CALL qtopology_sp_register_worker(?);";
        this.name = name;
        this.query(sql, [name], callback);
    }
    announceLeaderCandidacy(name, callback) {
        let self = this;
        let sql = "CALL qtopology_sp_disable_defunct_leaders();";
        self.query(sql, null, (err) => {
            if (err)
                return callback(err);
            let sql = "CALL qtopology_sp_announce_leader_candidacy(?);";
            self.query(sql, [name], callback);
        });
    }
    checkLeaderCandidacy(name, callback) {
        let self = this;
        let sql = "CALL qtopology_sp_check_leader_candidacy(?);";
        self.query(sql, [name], (err, data) => {
            if (err)
                return callback(err);
            callback(null, data && data.length > 0 && data[0].length > 0 && data[0][0].status == "leader");
        });
    }
    assignTopology(uuid, name, callback) {
        let sql = "CALL qtopology_sp_assign_topology(?, ?);";
        this.query(sql, [uuid, name], callback);
    }
    setTopologyStatus(uuid, status, error, callback) {
        let sql = "CALL qtopology_sp_update_topology_status(?, ?, ?);";
        this.query(sql, [uuid, status, error], callback);
    }
    setWorkerStatus(name, status, callback) {
        let sql = "CALL qtopology_sp_update_worker_status(?, ?);";
        this.query(sql, [name, status], callback);
    }
    registerTopology(uuid, config, callback) {
        let sql = "CALL qtopology_sp_register_topology(?, ?, ?, ?);";
        let affinity = "";
        if (config.general.worker_affinity) {
            affinity = config.general.worker_affinity.join(",");
        }
        let weight = config.general.weight || 1;
        this.query(sql, [uuid, JSON.stringify(config), weight, affinity], callback);
    }
    disableTopology(uuid, callback) {
        let sql = "CALL qtopology_sp_disable_topology(?);";
        this.query(sql, [uuid], callback);
    }
    enableTopology(uuid, callback) {
        let sql = "CALL qtopology_sp_enable_topology(?);";
        this.query(sql, [uuid], callback);
    }
    deleteTopology(uuid, callback) {
        let sql = "CALL qtopology_sp_delete_topology(?);";
        this.query(sql, [uuid], callback);
    }
}
exports.MySqlCoordinator = MySqlCoordinator;
//# sourceMappingURL=mysql_coordinator.js.map