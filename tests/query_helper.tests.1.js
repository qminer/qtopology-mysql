"use strict";

let assert = require("assert");
let ms = require("../built/mysql_storage");

//////////////////////////////////////////////////////////////////////////////////////

describe('MySqlStorage', function () {
    describe('retry', function () {
        let retry = ms.MySqlStorage.retry;
        describe('No error evaluation', function () {
            it('First call success', function (done) {
                retry(1, 0, null, (cb) => { cb(); }, done);
            });
            it('Second call success', function (done) {
                let retries = 0;
                retry(2, 0, null,
                    (cb) => {
                        cb(++retries >= 2 ? null : new Error("Some error"));
                    },
                    (err) => {
                        assert.equal(retries, 2);
                        done();
                    });
            });
            it('Second call success with timeout', function (done) {
                let retries = 0;
                let timestamps = [];
                retry(2, 500, null,
                    (cb) => {
                        timestamps.push(Date.now());
                        cb(++retries >= 2 ? null : new Error("Some error"));
                    },
                    (err) => {
                        assert.equal(retries, 2);
                        assert.equal(timestamps.length, 2);
                        assert.ok(timestamps[1] - timestamps[0] >= 500);
                        done();
                    });
            });
            it('Ten unsuccessful calls', function (done) {
                let retries = 0;
                retry(10, 0, null,
                    (cb) => {
                        cb(++retries >= 11 ? null : new Error("Some error"));
                    },
                    (err) => {
                        assert.equal(retries, 10);
                        assert.ok(err != null);
                        assert.equal(err.message, "Some error");
                        done();
                    });
            });
        });
        describe('With error evaluation', function () {
            it('Ten unsuccessful calls', function (done) {
                let retries = 0;
                retry(10, 0, null,
                    (cb) => {
                        cb(++retries >= 11 ? null : new Error("Some error " + retries));
                    },
                    (err) => {
                        assert.equal(retries, 10);
                        assert.ok(err != null);
                        assert.equal(err.message, "Some error 10");
                        done();
                    });
            });
            it('Five unsuccessful calls, sixth is marked as non-retriable', function (done) {
                let retries = 0;
                retry(10, 0,
                    (err) => {
                        return (+err.message.split(" ")[2] < 6);
                    },
                    (cb) => {
                        cb(++retries >= 11 ? null : new Error("Some error " + retries));
                    },
                    (err) => {
                        assert.equal(retries, 6);
                        assert.ok(err != null);
                        assert.equal(err.message, "Some error 6");
                        done();
                    });
            });
        });
    });
});
