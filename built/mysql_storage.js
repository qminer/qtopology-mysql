"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const port_default = 3306;
const mysql = require("mysql");
const async = require("async");
const path = require("path");
const qtopology = require("./qtopology");
const dbu = require("./db_updater");
const qh = require("./query_helper");
var db_updater_1 = require("./db_updater");
exports.DbUpgrader = db_updater_1.DbUpgrader;
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
// Coordination-storage implementation for MySQL
class MySqlStorage {
    static retry(times, timeout, isRetriableError, step, callback) {
        let cnt = 0;
        let break_loop = false;
        let last_err;
        let last_data = null;
        isRetriableError = isRetriableError || (() => true);
        async.doWhilst(xcallback => {
            step((err, last_data_current) => {
                break_loop = (err == null) || !isRetriableError(err);
                last_data = last_data_current;
                last_err = err;
                if (break_loop) {
                    xcallback();
                }
                else {
                    setTimeout(() => { xcallback(); }, timeout);
                }
            });
        }, () => (!break_loop && ++cnt < times), () => { callback(last_err, last_data); });
    }
    constructor(options) {
        this.name = null; // this will be set later
        this.options = JSON.parse(JSON.stringify(options));
        this.options.retries = this.options.retries || 1;
        this.options.retry_timeout = this.options.retry_timeout || 10 * 1000; // retry each 10 sec
        this.next_refresh = 0;
        this.db_check_only = this.options.db_check_only || false;
        this.pool = mysql.createPool({
            connectionLimit: 10,
            database: options.database,
            host: options.host,
            multipleStatements: true,
            password: options.password,
            port: options.port || port_default,
            user: options.user
        });
    }
    init(callback) {
        const self = this;
        this.pool.getConnection((err, conn) => {
            if (err) {
                return callback(err);
            }
            const db_upgrader = new dbu.DbUpgrader({
                conn,
                scripts_dir: path.join(__dirname, "/../db"),
                settings_table: "qtopology_settings",
                version_record_key: "db_version"
            });
            if (self.db_check_only) {
                db_upgrader.check(callback);
            }
            else {
                db_upgrader.run(callback);
            }
        });
    }
    close(callback) {
        callback = callback || (() => {
            // no-op
        });
        if (this.pool) {
            this.pool.end(callback);
        }
        else {
            callback();
        }
    }
    getMessages(name, callback) {
        const sql = "CALL qtopology_sp_messages_for_worker(?);";
        const self = this;
        self.query(sql, [name], (err, data) => {
            if (err) {
                return callback(err);
            }
            let res;
            res = [];
            const ids_to_delete = [];
            for (const rec of data[0]) {
                res.push({ cmd: rec.cmd, content: JSON.parse(rec.content), created: rec.created });
                ids_to_delete.push(rec.id);
            }
            async.each(ids_to_delete, (item, xcallback) => {
                const sql2 = qh.createDelete(table_names.qtopology_message, { id: item });
                self.query(sql2, null, xcallback);
            }, (err_inner) => {
                callback(err_inner, res);
            });
        });
    }
    getMessage(name, callback) {
        const sql = "CALL qtopology_sp_messages_for_worker(?);";
        const self = this;
        self.query(sql, [name], (err, data) => {
            if (err) {
                return callback(err);
            }
            let res = null;
            if (data[0] && data[0][0]) {
                const rec = data[0][0];
                res = { cmd: rec.cmd, content: JSON.parse(rec.content), created: rec.created };
                const sql2 = qh.createDelete(table_names.qtopology_message, { id: rec.id });
                self.query(sql2, null, err_inner => {
                    callback(err_inner, res);
                });
            }
            else {
                callback(err, null);
            }
        });
    }
    getWorkerStatusInternal(callback) {
        const self = this;
        const sql = qh.createSelect(["name", "status", "lstatus", "last_ping"], table_names.qtopology_worker, {});
        self.query(sql, null, (err, data) => {
            if (err) {
                return callback(err);
            }
            const res = [];
            for (const rec of data) {
                rec.last_ping = rec.last_ping || new Date();
                res.push({
                    name: rec.name,
                    status: rec.status,
                    lstatus: rec.lstatus,
                    last_ping: rec.last_ping.getTime(),
                    last_ping_d: rec.last_ping
                });
            }
            callback(null, res);
        });
    }
    getWorkerStatus(callback) {
        const self = this;
        self.getWorkerStatusInternal(callback);
    }
    getTopologyStatus(callback) {
        const sql = qh.createSelect(["uuid", "status", "worker", "weight", "worker_affinity", "enabled", "last_ping", "pid"], table_names.qtopology_topology, {});
        this.getTopologyStatusInternal(sql, null, callback);
    }
    getTopologiesForWorker(name, callback) {
        const sql = qh.createSelect(["uuid", "status", "worker", "weight", "worker_affinity", "enabled", "last_ping", "pid"], table_names.qtopology_topology, { worker: name });
        this.getTopologyStatusInternal(sql, null, callback);
    }
    getTopologyInfo(uuid, callback) {
        const self = this;
        const sql = qh.createSelect(["uuid", "status", "worker", "weight", "enabled", "worker_affinity", "error", "config", "last_ping", "pid"], table_names.qtopology_topology, { uuid });
        self.query(sql, null, (err, data) => {
            if (err) {
                return callback(err);
            }
            if (data.length == 0) {
                return callback(new Error("Requested topology not found: " + uuid));
            }
            const hit = data[0];
            const config = JSON.parse(qtopology.stripJsonComments(hit.config));
            callback(null, {
                enabled: hit.enabled,
                status: hit.status,
                uuid: hit.uuid,
                error: hit.error,
                weight: hit.weight,
                worker_affinity: hit.worker_affinity,
                worker: hit.worker,
                last_ping: hit.last_ping.getDate(),
                last_ping_d: hit.last_ping,
                config,
                pid: hit.pid
            });
        });
    }
    registerWorker(name, callback) {
        // this is called once at start-up and is the name of the worker that uses this coordination object
        // so we can save the name of the worker and use it later
        const sql = "CALL qtopology_sp_register_worker(?);";
        this.name = name;
        this.query(sql, [name], callback);
    }
    pingWorker(name, callback) {
        const sql = "CALL qtopology_sp_worker_ping(?);";
        this.name = name;
        this.query(sql, [name], callback);
    }
    announceLeaderCandidacy(name, callback) {
        const self = this;
        const sql = "CALL qtopology_sp_announce_leader_candidacy(?);";
        self.query(sql, [name], callback);
    }
    checkLeaderCandidacy(name, callback) {
        const self = this;
        const sql = "CALL qtopology_sp_check_leader_candidacy(?);";
        self.query(sql, [name], (err, data) => {
            if (err) {
                return callback(err);
            }
            callback(null, data && data.length > 0 && data[0].length > 0 &&
                data[0][0].status == qtopology.CONSTS.WorkerLStatus.leader);
        });
    }
    assignTopology(uuid, name, callback) {
        let sql = qh.createUpdate({
            worker: name,
            last_ping: new Date(),
            status: qtopology.CONSTS.TopologyStatus.waiting
        }, table_names.qtopology_topology, { uuid });
        sql += "call qtopology_sp_add_topology_history(?);";
        this.query(sql, [uuid], callback);
    }
    setTopologyStatus(uuid, worker, status, error, callback) {
        const cmd = { status, last_ping: new Date(), error };
        const filter = { uuid };
        if (worker) {
            filter.worker = worker;
        }
        let sql = qh.createUpdate(cmd, table_names.qtopology_topology, filter);
        sql += "call qtopology_sp_add_topology_history(?);";
        this.query(sql, [uuid], callback);
    }
    setTopologyPid(uuid, pid, callback) {
        let sql = qh.createUpdate({ pid, last_ping: new Date() }, table_names.qtopology_topology, { uuid });
        sql += "call qtopology_sp_add_topology_history(?);";
        this.query(sql, [uuid], callback);
    }
    setWorkerStatus(name, status, callback) {
        let sql = qh.createUpdate({ status, last_ping: new Date() }, table_names.qtopology_worker, { name });
        sql += "call qtopology_sp_add_worker_history(?);";
        this.query(sql, [name], callback);
    }
    setWorkerLStatus(name, lstatus, callback) {
        let sql = qh.createUpdate({ lstatus, last_ping: new Date() }, table_names.qtopology_worker, { name });
        sql += "call qtopology_sp_add_worker_history(?);";
        this.query(sql, [name], callback);
    }
    registerTopology(uuid, config, callback) {
        const sql = "CALL qtopology_sp_register_topology(?, ?, ?, ?);";
        let affinity = "";
        if (config.general.worker_affinity) {
            affinity = config.general.worker_affinity.join(",");
        }
        const weight = config.general.weight || 1;
        this.query(sql, [uuid, JSON.stringify(config), weight, affinity], callback);
    }
    disableTopology(uuid, callback) {
        let sql = qh.createUpdate({ enabled: 0 }, table_names.qtopology_topology, { uuid });
        sql += "call qtopology_sp_add_topology_history(?);";
        this.query(sql, [uuid], callback);
    }
    enableTopology(uuid, callback) {
        let sql = qh.createUpdate({ enabled: 1 }, table_names.qtopology_topology, { uuid });
        sql += "call qtopology_sp_add_topology_history(?);";
        this.query(sql, [uuid], callback);
    }
    deleteTopology(uuid, callback) {
        const sql = qh.createDelete(table_names.qtopology_topology, { uuid });
        this.query(sql, null, callback);
    }
    getProperties(callback) {
        const res = [];
        res.push({ key: "type", value: "MySqlStorage" });
        res.push({ key: "host", value: this.options.host });
        res.push({ key: "database", value: this.options.database });
        res.push({ key: "port", value: this.options.port });
        res.push({ key: "user", value: this.options.user });
        res.push({ key: "multipleStatements", value: true });
        res.push({ key: "connectionLimit", value: 10 });
        callback(null, res);
    }
    sendMessageToWorker(worker, cmd, content, valid_msec, callback) {
        const sql = qh.createInsert({
            worker,
            cmd,
            content: JSON.stringify(content),
            created: new Date(),
            valid_until: new Date(Date.now() + valid_msec)
        }, table_names.qtopology_message);
        this.query(sql, null, callback);
    }
    getMsgQueueContent(callback) {
        const self = this;
        const sql = qh.createSelect(["worker", "cmd", "content", "created", "valid_until"], table_names.qtopology_message, {});
        this.query(sql, null, (err, data) => {
            if (err) {
                return callback(err);
            }
            const res = data.map(x => {
                return {
                    name: x.worker,
                    cmd: x.cmd,
                    data: JSON.parse(x.content),
                    created: x.created,
                    valid_until: x.valid_until
                };
            });
            callback(null, res);
        });
    }
    stopTopology(uuid, callback) {
        this.stopTopologyInternal(uuid, false, callback);
    }
    killTopology(uuid, callback) {
        this.stopTopologyInternal(uuid, true, callback);
    }
    clearTopologyError(uuid, callback) {
        const self = this;
        self.getTopologyInfo(uuid, (err, data) => {
            if (err) {
                return callback(err);
            }
            const hit = data;
            if (hit.status != qtopology.CONSTS.TopologyStatus.error) {
                return callback(new Error("Specified topology is not marked as error: " + uuid));
            }
            self.setTopologyStatus(uuid, null, qtopology.CONSTS.TopologyStatus.unassigned, null, callback);
        });
    }
    deleteWorker(name, callback) {
        const self = this;
        self.getWorkerStatus((err, data) => {
            if (err) {
                return callback(err);
            }
            const hits = data.filter(x => x.name == name);
            if (hits.length > 0) {
                if (hits[0].status == qtopology.CONSTS.WorkerStatus.unloaded) {
                    const sql = qh.createDelete(table_names.qtopology_worker, { name, status: qtopology.CONSTS.WorkerStatus.unloaded });
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
        this.sendMessageToWorker(name, qtopology.CONSTS.LeaderMessages.shutdown, {}, 60 * 1000, callback);
    }
    getTopologyHistory(uuid, callback) {
        const self = this;
        const sql = qh.createSelect(["*"], table_names.qtopology_topology_history, { uuid }, ["ts desc"], 100);
        self.query(sql, [uuid], (err, data) => {
            if (err) {
                return callback(err);
            }
            let res;
            res = [];
            data.forEach(x => {
                x.last_ping = x.last_ping || new Date(0);
                res.push({
                    enabled: x.enabled,
                    error: x.error,
                    status: x.status,
                    ts: x.ts,
                    uuid: x.uuid,
                    weight: x.weight,
                    worker: x.worker,
                    pid: x.pid,
                    last_ping: x.last_ping.getDate(),
                    last_ping_d: x.last_ping,
                    worker_affinity: x.worker_affinity
                });
            });
            callback(null, data);
        });
    }
    getWorkerHistory(name, callback) {
        const self = this;
        const sql = qh.createSelect(["*"], table_names.qtopology_worker_history, { name }, ["ts desc"], 100);
        self.query(sql, [name], (err, data) => {
            if (err) {
                return callback(err);
            }
            let res;
            res = [];
            data.forEach(x => {
                res.push({
                    lstatus: x.lstatus,
                    name: x.name,
                    status: x.status,
                    pid: x.pid,
                    ts: x.ts
                });
            });
            callback(null, data);
        });
    }
    log(s) {
        qtopology.logger().debug("[MySqlStorage] " + s);
    }
    query(sql, obj, callback) {
        const self = this;
        try {
            self.log(`${sql} ${obj}`);
            MySqlStorage.retry(this.options.retries, this.options.retry_timeout, err => {
                const err_mysql = err;
                return (err_mysql && (err_mysql.sqlState == "HY000" ||
                    err_mysql.code == "PROTOCOL_SEQUENCE_TIMEOUT" ||
                    err_mysql.code == "ER_OPTION_PREVENTS_STATEMENT" ||
                    (err_mysql.sqlMessage && err_mysql.sqlMessage.indexOf("The server closed the connection") >= 0)));
            }, xcallback => {
                // self.pool.query(sql, obj || [], xcallback);
                self.pool.getConnection((err, con) => {
                    if (err) {
                        return xcallback(err);
                    }
                    con.query(sql, obj || [], (err_inner, data) => {
                        if (err_inner) {
                            const logger = qtopology.logger();
                            logger.error("Error while executing SQL");
                            logger.error(sql);
                            logger.error(JSON.stringify(obj || []));
                            logger.exception(err_inner);
                        }
                        const err_mysql = err_inner;
                        if (err_inner && err_mysql.sqlMessage &&
                            err_mysql.sqlMessage.indexOf("The server closed the connection") >= 0) {
                            // this connection should be thrown away and a new one should be opened
                            con.destroy();
                        }
                        else {
                            con.release();
                        }
                        xcallback(err_inner, data);
                    });
                });
            }, (err, data) => {
                if (err) {
                    const logger = qtopology.logger();
                    logger.error("Error while executing SQL");
                    logger.error(sql);
                    logger.error(JSON.stringify(obj || []));
                    logger.exception(err);
                }
                callback(err, data);
            });
        }
        catch (e) {
            const logger = qtopology.logger();
            logger.error("Error while executing SQL");
            logger.error(sql);
            logger.error(JSON.stringify(obj || []));
            logger.exception(e);
            callback(e);
        }
    }
    getTopologyStatusInternal(sql, obj, callback) {
        const self = this;
        self.query(sql, obj, (err, data) => {
            if (err) {
                return callback(err);
            }
            const res = [];
            for (const rec of data) {
                res.push({
                    uuid: rec.uuid,
                    status: rec.status,
                    worker: rec.worker,
                    weight: rec.weight,
                    enabled: !!rec.enabled,
                    error: rec.error,
                    pid: rec.pid,
                    last_ping: rec.last_ping,
                    worker_affinity: (rec.worker_affinity || "").split(",").filter(x => x.length > 0)
                });
            }
            callback(null, res);
        });
    }
    stopTopologyInternal(uuid, do_kill, callback) {
        const self = this;
        self.getTopologyInfo(uuid, (err, data) => {
            if (err) {
                return callback(err);
            }
            if (!data.worker) {
                return callback();
            }
            self.disableTopology(uuid, err => {
                if (err) {
                    return callback(err);
                }
                self.sendMessageToWorker(data.worker, (do_kill ?
                    qtopology.CONSTS.LeaderMessages.kill_topology :
                    qtopology.CONSTS.LeaderMessages.stop_topology), { uuid }, 30 * 1000, callback);
            });
        });
    }
}
exports.MySqlStorage = MySqlStorage;
//# sourceMappingURL=mysql_storage.js.map