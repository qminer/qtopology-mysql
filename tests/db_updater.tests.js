"use strict";

let path = require("path");
let assert = require("assert");
let qtopology = require("qtopology");
let dbu = require("../built/db_updater");

//////////////////////////////////////////////////////////////////////////////////////

const scripts_dir = path.normalize("some/scripts/dir");
const settings_table = "SomeWeirdNameForSettingsTable";
const version_record_key = "SomeWeirdNameForASetting";

qtopology.logger().setLevel("none");

describe('DB updater', function () {
    describe('run', function () {
        it('should handle empty query result', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        case path.join(scripts_dir, "init.sql"): return "init.sql";
                        case "v1.sql": return "v1.sql";
                        case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, []);
                        case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                            return cb(null, []);
                        case `init.sql`:
                            return cb(null, []);
                        case `v1.sql`:
                            return cb(null, []);
                        case `v2.sql`:
                            return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
        it('should handle DB lower', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        case path.join(scripts_dir, "init.sql"): return "init.sql";
                        //case "v1.sql": return "v1.sql";
                        case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, [{ name: "", value: "1"}]);
                        //case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                            return cb(null, []);
                        case `init.sql`:
                            return cb(null, []);
                        // case `v1.sql`:
                        //     return cb(null, []);
                        case `v2.sql`:
                            return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
        it('should handle DB at latest', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        case path.join(scripts_dir, "init.sql"): return "init.sql";
                        //case "v1.sql": return "v1.sql";
                        //case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, [{ name: "", value: "2"}]);
                        //case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        // case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                        //     return cb(null, []);
                        case `init.sql`:
                            return cb(null, []);
                        // case `v1.sql`:
                        //     return cb(null, []);
                        // case `v2.sql`:
                        //     return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
    });
    describe('run with injected init script name', function () {
        it('should handle empty query result', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        case path.join(scripts_dir, "init2.sql"): return "init2.sql";
                        case "v1.sql": return "v1.sql";
                        case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, []);
                        case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                            return cb(null, []);
                        case `init2.sql`:
                            return cb(null, []);
                        case `v1.sql`:
                            return cb(null, []);
                        case `v2.sql`:
                            return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs,
                init_script_name: "init2.sql"
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
        it('should handle DB lower', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        case path.join(scripts_dir, "init2.sql"): return "init2.sql";
                        //case "v1.sql": return "v1.sql";
                        case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, [{ name: "", value: "1"}]);
                        //case `update ${settings_table} set value = '1' where name = '${version_record_key};'`:
                        case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                            return cb(null, []);
                        case `init2.sql`:
                            return cb(null, []);
                        // case `v1.sql`:
                        //     return cb(null, []);
                        case `v2.sql`:
                            return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs,
                init_script_name: "init2.sql"
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
        it('should handle DB at latest', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        case path.join(scripts_dir, "init2.sql"): return "init2.sql";
                        //case "v1.sql": return "v1.sql";
                        //case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, [{ name: "", value: "2"}]);
                        //case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        // case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                        //     return cb(null, []);
                        case `init2.sql`:
                            return cb(null, []);
                        // case `v1.sql`:
                        //     return cb(null, []);
                        // case `v2.sql`:
                        //     return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs,
                init_script_name: "init2.sql"
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
    });
    describe('run with no init script', function () {
        it('should handle empty query result', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        //case path.join(scripts_dir, "init2.sql"): return "init2.sql";
                        case "v1.sql": return "v1.sql";
                        case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, []);
                        case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                            return cb(null, []);
                        // case `init2.sql`:
                        //     return cb(null, []);
                        case `v1.sql`:
                            return cb(null, []);
                        case `v2.sql`:
                            return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs,
                use_init_script: false
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
        it('should handle DB lower', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        //case path.join(scripts_dir, "init2.sql"): return "init2.sql";
                        //case "v1.sql": return "v1.sql";
                        case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, [{ name: "", value: "1"}]);
                        //case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                            return cb(null, []);
                        // case `init2.sql`:
                        //     return cb(null, []);
                        // case `v1.sql`:
                        //     return cb(null, []);
                        case `v2.sql`:
                            return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs,
                use_init_script: false
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
        it('should handle DB at latest', function (done) {
            let mock_fs = {
                readFileSync: (fname) => {
                    switch (fname) {
                        //case path.join(scripts_dir, "init2.sql"): return "init2.sql";
                        //case "v1.sql": return "v1.sql";
                        //case "v2.sql": return "v2.sql";
                    }
                    assert.fail("Unexpected file to read: " + fname);
                }
            };
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    switch (sql) {
                        case `select value from ${settings_table} where name = '${version_record_key}';`:
                            return cb(null, [{ name: "", value: "2"}]);
                        //case `update ${settings_table} set value = '1' where name = '${version_record_key}';`:
                        // case `update ${settings_table} set value = '2' where name = '${version_record_key}';`:
                        //     return cb(null, []);
                        // case `init2.sql`:
                        //     return cb(null, []);
                        // case `v1.sql`:
                        //     return cb(null, []);
                        // case `v2.sql`:
                        //     return cb(null, []);
                    }
                    assert.fail("Unexpected sql: " + sql);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key,
                fs: mock_fs,
                use_init_script: false
            });
            target.run((err) => {
                assert.ok(err == null);
                done();
            });
        });
    });
    describe('check', function () {
        it('should handle empty query result', function (done) {
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select value from ${settings_table} where name = '${version_record_key}';`);
                    cb(null, []);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key
            });
            target.check((err) => {
                assert.ok(err);
                done();
            });
        });
        it('should handle query error', function (done) {
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 2;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select value from ${settings_table} where name = '${version_record_key}';`);
                    cb(new Error("Some error"));
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key
            });
            target.check((err) => {
                assert.ok(err);
                assert.equal(err.message, "Some error");
                done();
            });
        });
        it('should handle empty scripts dir', function (done) {
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return [];
                }
            };
            let curr_value = 2;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select value from ${settings_table} where name = '${version_record_key}';`);
                    cb(null, [{ value: curr_value }]);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key
            });
            target.check((err) => {
                assert.equal(err.message, "Directory with SQL version upgrades is empty.");
                done();
            });
        });
        it('should handle ok status', function (done) {
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 2;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select value from ${settings_table} where name = '${version_record_key}';`);
                    cb(null, [{ value: curr_value }]);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key
            });
            target.check((err) => {
                assert.ok(err == null);
                done();
            });
        });
        it('should handle DB lower', function (done) {
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 1;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select value from ${settings_table} where name = '${version_record_key}';`);
                    cb(null, [{ value: curr_value }]);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key
            });
            target.check((err) => {
                assert.ok(err.message.startsWith("Version mismatch in QTopology SQL"));
                done();
            });
        });
        it('should handle DB higher', function (done) {
            let mock_glob = {
                sync: (p) => {
                    assert.equal(p, path.normalize(scripts_dir + "/v*.sql"));
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 3;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select value from ${settings_table} where name = '${version_record_key}';`);
                    cb(null, [{ value: curr_value }]);
                }
            }
            let target = new dbu.DbUpgrader({
                conn: mock_conn,
                glob: mock_glob,
                scripts_dir: scripts_dir,
                settings_table: settings_table,
                version_record_key: version_record_key
            });
            target.check((err) => {
                assert.ok(err.message.startsWith("Version mismatch in QTopology SQL"));
                done();
            });
        });
    });
});
