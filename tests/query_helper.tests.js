"use strict";

let assert = require("assert");
let qh = require("../built/query_helper");

//////////////////////////////////////////////////////////////////////////////////////

describe('Query helper', function () {
    describe('mapQuery', function () {
        it('should handle empty query', function () {
            let q = { };
            let res = qh.mapQuery(q);
            assert.equal(res, "");
        });
        it('should handle simple string', function () {
            let q = { b: "x" };
            let res = qh.mapQuery(q);
            assert.equal(res, "where b = 'x'");
        });
        it('should handle simple number', function () {
            let q = { b: 123.456 };
            let res = qh.mapQuery(q);
            assert.equal(res, "where b = 123.456");
        });
        it('should handle $like', function () {
            let q = { b: { $like: "%aaa%"} };
            let res = qh.mapQuery(q);
            assert.equal(res, "where b like '%aaa%'");
        });
        it('should handle $gt', function () {
            let q = { b: { $gt: "aaa"} };
            let res = qh.mapQuery(q);
            assert.equal(res, "where b > 'aaa'");
        });
        it('should handle 2 strings', function () {
            let q = { b: "x", c: "y" };
            let res = qh.mapQuery(q);
            assert.equal(res, "where b = 'x' and c = 'y'");
        });
        it('should handle 2 OR-ed strings', function () {
            let q = { $or: [ { b: "x" }, { c: "y" }]};
            let res = qh.mapQuery(q);
            assert.equal(res, "where (b = 'x' or c = 'y')");
        });
    });
    describe('createInsert', function () {
        it('should handle simple class', function () {
            let data = { a: 1, b: "x" };
            let table = "tab1";
            let res = qh.createInsert(data, table);
            assert.equal(res, "insert into tab1(a, b) values (1, 'x');");
        });
        it('should handle Date', function () {
            let data = { a: new Date("2016-08-05T12:34:56Z") };
            let table = "tab1";
            let res = qh.createInsert(data, table);
            assert.equal(res, "insert into tab1(a) values (FROM_UNIXTIME(1470400496000 / 1000));");
        });
        it('should handle string with dangerous characters', function () {
            let data = { a: "\"'" };
            let table = "tab1";
            let res = qh.createInsert(data, table);
            assert.equal(res, "insert into tab1(a) values ('\"''');");
        });
    });
    describe('createUpdate', function () {
        it('should handle simple class via ID', function () {
            let data = { id: 1, b: "x" };
            let table = "tab1";
            let res = qh.createUpdate(data, table);
            assert.equal(res, "update tab1 set b = 'x' where id = 1;");
        });
        it('should handle simple class via query', function () {
            let data = { id: 1, b: "x" };
            let query = { c: 45 };
            let table = "tab1";
            let res = qh.createUpdate(data, table, query);
            assert.equal(res, "update tab1 set id = 1, b = 'x' where c = 45;");
        });
    });
    describe('createDelete', function () {
        it('should handle simple delete via ID', function () {
            let query = { id: 1 };
            let table = "tab1";
            let res = qh.createDelete(table, query);
            assert.equal(res, "delete from tab1 where id = 1;");
        });
        it('should handle simple delete via empty query', function () {
            let query = { };
            let table = "tab1";
            let res = qh.createDelete(table, query);
            assert.equal(res, "delete from tab1 ;");
        });
    });
    describe('createSelect', function () {
        it('should handle simple delete via ID', function () {
            let query = { id: 1 };
            let table = "tab1";
            let fields = ["a", "b", "c"];
            let res = qh.createSelect(fields, table, query);
            assert.equal(res, "select a,b,c from tab1 where id = 1;");
        });
    });
});
