"use strict";

let assert = require("assert");
let qtopology = require("qtopology");
let dbu = require("../built/db_updater");

//////////////////////////////////////////////////////////////////////////////////////

const scripts_dir = "some/scripts/dir";
const settings_table = "SomeWeirdNameForSettingsTable";
const version_record_key = "SomeWeirdNameForASetting";

qtopology.logger().setLevel("none");

describe('DB updater', function () {
    describe('check', function () {
        it('should handle empty query result', function (done) {
            let mock_glob = {
                sync: (path) => {
                    assert.equal(path, scripts_dir + "/v*.sql");
                    return ["v1.sql", "v2.sql"];
                }
            };
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select name, value from ${settings_table} where name = '${version_record_key}';`);
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
                sync: (path) => {
                    assert.equal(path, scripts_dir + "/v*.sql");
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 2;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select name, value from ${settings_table} where name = '${version_record_key}';`);
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
                sync: (path) => {
                    assert.equal(path, scripts_dir + "/v*.sql");
                    return [];
                }
            };
            let curr_value = 2;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select name, value from ${settings_table} where name = '${version_record_key}';`);
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
                sync: (path) => {
                    assert.equal(path, scripts_dir + "/v*.sql");
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 2;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select name, value from ${settings_table} where name = '${version_record_key}';`);
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
                sync: (path) => {
                    assert.equal(path, scripts_dir + "/v*.sql");
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 1;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select name, value from ${settings_table} where name = '${version_record_key}';`);
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
                sync: (path) => {
                    assert.equal(path, scripts_dir + "/v*.sql");
                    return ["v1.sql", "v2.sql"];
                }
            };
            let curr_value = 3;
            let mock_conn = {
                query: (sql, cb) => {
                    assert.equal(sql, `select name, value from ${settings_table} where name = '${version_record_key}';`);
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
