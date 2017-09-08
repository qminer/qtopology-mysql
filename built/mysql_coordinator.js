"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const port_default = 3306;
const mysql = require("mysql");
const async = require("async");
const path = require("path");
const qtopology = require("qtopology");
const dbu = require("./db_updater");
const qh = require("./query_helper");
//////////////////////////////////////////////////////////////////////
const table_names = {
    qtopology_message: "qtopology_message",
    qtopology_settings: "qtopology_settings",
    qtopology_topology: "qtopology_topology",
    qtopology_topology_history: "qtopology_topology_history",
    qtopology_worker: "qtopology_worker",
    qtopology_worker_history: "qtopology_worker_history"
};
//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation for MySQL
class MySqlCoordinator {
    constructor(options) {
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
            let res;
            res = [];
            let ids_to_delete = [];
            for (let rec of data[0]) {
                res.push({ cmd: rec.cmd, content: JSON.parse(rec.content), created: rec.created });
                ids_to_delete.push(rec.id);
            }
            async.each(ids_to_delete, (item, xcallback) => {
                let sql2 = qh.createDelete(table_names.qtopology_message, { id: item });
                self.query(sql2, null, xcallback);
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
            sql = qh.createSelect(["name", "status", "lstatus", "lstatus_ts", "last_ping"], table_names.qtopology_worker, {});
            self.query(sql, null, (err, data) => {
                if (err)
                    return callback(err);
                let res = [];
                for (let rec of data) {
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
                for (let rec of data) {
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
    getTopologyStatus(callback) {
        let sql = qh.createSelect(["uuid", "status", "worker", "weight", "worker_affinity", "enabled"], table_names.qtopology_topology, {});
        this.getTopologyStatusInternal(sql, null, callback);
    }
    getTopologiesForWorker(name, callback) {
        let sql = qh.createSelect(["uuid", "status", "worker", "weight", "worker_affinity", "enabled"], table_names.qtopology_topology, { worker: name });
        this.getTopologyStatusInternal(sql, null, callback);
    }
    getTopologyInfo(uuid, callback) {
        let self = this;
        let sql = qh.createSelect(["uuid", "status", "worker", "weight", "enabled", "worker_affinity", "error", "config"], table_names.qtopology_topology, { uuid: uuid });
        self.query(sql, null, (err, data) => {
            if (err)
                return callback(err);
            if (data.length == 0)
                return callback(new Error("Requested topology not found: " + uuid));
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
                let hits = data.filter(x => x.lstatus == qtopology.Consts.WorkerLStatus.leader);
                if (hits.length > 0 && hits[0].cnt > 0)
                    return callback(null, { leadership: qtopology.Consts.LeadershipStatus.ok });
                hits = data.filter(x => x.lstatus == qtopology.Consts.WorkerLStatus.candidate);
                if (hits.length > 0 && hits[0].cnt > 0)
                    return callback(null, { leadership: qtopology.Consts.LeadershipStatus.pending });
                callback(null, { leadership: qtopology.Consts.LeadershipStatus.vacant });
            });
        });
    }
    registerWorker(name, callback) {
        // this is called once at start-up and is the name of the worker that uses this coordination object
        // so we can save the name of the worker and use it later
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
            callback(null, data && data.length > 0 && data[0].length > 0 && data[0][0].status == qtopology.Consts.WorkerLStatus.leader);
        });
    }
    assignTopology(uuid, name, callback) {
        let sql = qh.createUpdate({ worker: name, status: qtopology.Consts.TopologyStatus.waiting }, table_names.qtopology_topology, { uuid: uuid });
        sql += "call qtopology_sp_add_topology_history(?);";
        this.query(sql, [uuid], callback);
    }
    setTopologyStatus(uuid, status, error, callback) {
        let sql = qh.createUpdate({ status: status, last_ping: new Date(), error: error }, table_names.qtopology_topology, { uuid: uuid });
        sql += "call qtopology_sp_add_topology_history(?);";
        this.query(sql, [uuid], callback);
    }
    setWorkerStatus(name, status, callback) {
        let sql = qh.createUpdate({ status: status, last_ping: new Date() }, table_names.qtopology_worker, { name: name });
        sql += "call qtopology_sp_add_worker_history(?);";
        this.query(sql, [name], callback);
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
        let sql = qh.createUpdate({ enabled: 0 }, table_names.qtopology_topology, { uuid: uuid });
        this.query(sql, null, callback);
    }
    enableTopology(uuid, callback) {
        let sql = qh.createUpdate({ enabled: 1 }, table_names.qtopology_topology, { uuid: uuid });
        this.query(sql, null, callback);
    }
    deleteTopology(uuid, callback) {
        let sql = qh.createDelete(table_names.qtopology_topology, { uuid: uuid });
        this.query(sql, null, callback);
    }
    getProperties(callback) {
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
    sendMessageToWorker(worker, cmd, content, callback) {
        let sql = qh.createInsert({ worker: worker, cmd: cmd, content: JSON.stringify(content), created: new Date() }, table_names.qtopology_message);
        this.query(sql, null, callback);
    }
    stopTopology(uuid, callback) {
        let self = this;
        self.getTopologyInfo(uuid, (err, data) => {
            if (err)
                return callback(err);
            if (!data.worker)
                return callback();
            self.disableTopology(uuid, (err) => {
                if (err)
                    return callback(err);
                self.sendMessageToWorker(data.worker, "stop-topology", { uuid: uuid }, callback);
            });
        });
    }
    clearTopologyError(uuid, callback) {
        let self = this;
        self.getTopologyInfo(uuid, (err, data) => {
            if (err)
                return callback(err);
            let hit = data;
            if (hit.status != qtopology.Consts.TopologyStatus.error) {
                return callback(new Error("Specified topology is not marked as error: " + uuid));
            }
            self.setTopologyStatus(uuid, qtopology.Consts.TopologyStatus.unassigned, null, callback);
            callback();
        });
    }
    deleteWorker(name, callback) {
        let self = this;
        self.getWorkerStatus((err, data) => {
            if (err)
                return callback(err);
            let hits = data.filter(x => x.name == name);
            if (hits.length > 0) {
                if (hits[0].status == qtopology.Consts.WorkerStatus.unloaded) {
                    let sql = qh.createDelete(table_names.qtopology_worker, { name: name, status: qtopology.Consts.WorkerStatus.unloaded });
                    self.query(sql, null, callback);
                }
                else {
                    callback(new Error("Specified worker is not unloaded and cannot be deleted."));
                }
            }
            else {
                callback(new Error("Specified worker doesn't exist and thus cannot be deleted."));
            }
        });
    }
    shutDownWorker(name, callback) {
        this.sendMessageToWorker(name, "shutdown", {}, callback);
    }
    getTopologyHistory(uuid, callback) {
        let self = this;
        let sql = qh.createSelect(["*"], table_names.qtopology_topology_history, { uuid: uuid }, ["ts desc"], 100);
        self.query(sql, [uuid], (err, data) => {
            if (err)
                return callback(err);
            let res;
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
    getWorkerHistory(name, callback) {
        let self = this;
        let sql = qh.createSelect(["*"], table_names.qtopology_worker_history, { name: name }, ["ts desc"], 100);
        self.query(sql, [name], (err, data) => {
            if (err)
                return callback(err);
            let res;
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
exports.MySqlCoordinator = MySqlCoordinator;
//# sourceMappingURL=mysql_coordinator.js.map