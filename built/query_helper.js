"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 */
function isObjectLike(value) {
    return !!value && typeof value == "object";
}
/** `Object#toString` result references. */
const objectTag = "[object Object]";
/** Used for built-in method references. */
const objectProto = Object.prototype;
/** Used to resolve the decompiled source of functions. */
const funcToString = Function.prototype.toString;
/** Used to infer the `Object` constructor. */
const objectCtorString = funcToString.call(Object);
/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
const objectToString = objectProto.toString;
/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
    // Many host objects are `Object` objects that can coerce to strings
    // despite having improperly defined `toString` methods.
    let result = false;
    if (value != null && typeof value.toString != "function") {
        try {
            /*jshint -W018 */
            result = !!(value + "");
            /*jshint +W018 */
        }
        catch (e) {
            // no-op
        }
    }
    return result;
}
/**
 * This method check if given value is plain object
 */
function isPlainObject(value) {
    if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto === null) {
        return true;
    }
    const ctor = proto.constructor;
    return (typeof ctor == "function" && ctor instanceof ctor && funcToString.call(ctor) == objectCtorString);
}
/**
 * Utility method that escapes string for SQL.
 */
function _escapeString(val) {
    val = val.replace(/[\0\n\r\b\t\\'\x1a]/g, s => {
        switch (s) {
            case "\0": return "\\0";
            case "\n": return "\\n";
            case "\r": return "\\r";
            case "\b": return "\\b";
            case "\t": return "\\t";
            case "\x1a": return "\\Z";
            case "'": return "''";
            default: return "\\" + s;
        }
    });
    return val;
}
/**
 * This function formats given value into proper SQL.
 * @param value {object} - condition value
 */
function format(value) {
    if (value == null) {
        return "NULL";
    }
    if (value instanceof Date) {
        return "FROM_UNIXTIME(" + value.getTime() + " / 1000)";
    }
    if (typeof value == "string") {
        return "'" + _escapeString(value) + "'";
    }
    return value;
}
/**
 * This function formats given array of values into proper SQL.
 * @param value {array} - array of value
 */
function formatList(value) {
    const res = value.map(x => format(x));
    return "(" + res.join(",") + ")";
}
/**
 * This function processes single condition.
 * @param key {object} - condition name (field). Can be null.
 * @param value {object} - condition value
 */
function processSingle(key, value) {
    const comparatorMap = {
        $between: "between",
        $eq: "=",
        $gt: ">",
        $gte: ">=",
        $is: "is",
        $like: "like",
        $lt: "<",
        $lte: "<=",
        $ne: "<>",
        $not: "is not",
        $notBetween: "not between",
        $notLike: "not like"
    };
    if (key === undefined && Array.isArray(value)) {
        key = "$and";
    }
    if (key === "$plain") {
        return value;
    }
    else if (key === "$or" || key === "$and" || key === "$not") {
        // OR/AND/NOT grouping logic
        const binding = (key === "$or") ? " or " : " and ";
        let outerBinding = "";
        if (key === "$not") {
            outerBinding = "not ";
        }
        if (Array.isArray(value)) {
            value = value.map(x => {
                let itemQuery = processObj(x, " and ");
                if ((Array.isArray(x) || isPlainObject(x)) && x.length > 1) {
                    itemQuery = "(" + itemQuery + ")";
                }
                return itemQuery;
            }).filter(x => x && x.length);
            return value.length ? outerBinding + "(" + value.join(binding) + ")" : undefined;
        }
        else {
            value = processObj(value, binding);
            return value ? outerBinding + "(" + value + ")" : undefined;
        }
    }
    else {
        if (value === undefined || value === null) {
            return key + " is null";
        }
        if (isPlainObject(value)) {
            let sub_items = [];
            for (const i in value) {
                if (i == "$in") {
                    sub_items.push(key + " in " + formatList(value[i]));
                }
                else {
                    sub_items.push(key + " " + comparatorMap[i] + " " + format(value[i]));
                }
            }
            sub_items = sub_items.filter(x => x && x.length);
            if (sub_items.length > 0) {
                return sub_items.join(" and ");
            }
            return null;
        }
        // handle $ne, $gt, etc.
        return key + " = " + format(value);
    }
}
/**
 * This function processes single object and returns corresponding query.
 * @param obj {object} - complex query object or array
 * @param operator {string} - operator that should combine the detected conditions. Optional, default is AND.
 */
function processObj(obj, operator) {
    const is_array = Array.isArray(obj);
    if ((is_array && obj.length === 0) ||
        // (_.isPlainObject(obj) && _.isEmpty(obj)) ||
        obj === null ||
        obj === undefined) {
        // NO OP
        return "";
    }
    let items = [];
    let binding = operator || "and";
    if (binding.substr(0, 1) !== " ") {
        binding = " " + binding + " ";
    }
    if (is_array) {
        items.push(processSingle(undefined, obj));
    }
    else {
        for (const key in obj) {
            items.push(processSingle(key, obj[key]));
        }
    }
    // remove empty conditions
    items = items.filter(x => x && x.length);
    if (items.length == 0) {
        return "";
    }
    return items.join(binding);
}
/**
 * Helper function that creates complex WHERE statement as string from given object
 * @param q {object} - complex query object
 */
function mapQuery(q) {
    const query = processObj(q, null);
    if (query && query.length) {
        return "where " + query;
    }
    return "";
}
exports.mapQuery = mapQuery;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility functions
/**
 * This method inspects given record and constructs list of fields
 * that correspond to properties of the object.
 * @param record {object} - record to be inspected
 */
function createListOfFields(record) {
    const fields = [];
    for (const i in record) {
        fields.push(i);
    }
    return fields.join(", ");
}
exports.createListOfFields = createListOfFields;
/**
 * This method inspects given record and constructs list of fields
 * that correspond to properties of the object.
 * @param record {object} - record to be inspected
 */
function createListOfFieldValues(record) {
    let str = "";
    for (const i in record) {
        str += i + "=values(" + i + "), ";
    }
    return str.substring(0, str.length - 2);
}
exports.createListOfFieldValues = createListOfFieldValues;
function createListOfSetValues(record) {
    let str = "";
    for (const i in record) {
        str += i + "=" + format(record[i]) + ",";
    }
    return str.substring(0, str.length - 1);
}
exports.createListOfSetValues = createListOfSetValues;
/**
 * This method inspects given record and constructs list of fields
 * that correspond to properties of the object.
 * @param record {object} - record to be inspected
 */
function createListOfFieldsRaw(record) {
    const fields = [];
    for (const i in record) {
        fields.push(i);
    }
    return fields;
}
exports.createListOfFieldsRaw = createListOfFieldsRaw;
/**
 * This method maps given record into an array of values that correspond to
 * field names, provided in parameter.
 * @param record {object} - record to be mapped
 * @param field_list {array} - list of field names
 */
function mapObjectToArrayOfFields(record, field_list) {
    const result = [];
    for (const field of field_list) {
        result.push(record[field]);
    }
    return result;
}
exports.mapObjectToArrayOfFields = mapObjectToArrayOfFields;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * This method creates INSERT statement for given object and given table.
 * @param record {object} - record to be inserted
 * @param table {string} - name of the table to insert into
 */
function createInsert(record, table) {
    const vals_a = [];
    for (const field of record) {
        vals_a.push(format(field));
    }
    const vals = vals_a.join(", ");
    const sql = `insert into ${table}(${createListOfFields(record)}) values (${vals})`;
    return sql.trim() + ";";
}
exports.createInsert = createInsert;
/**
 * This method creates UPSERT statement for given object and given table.
 * @param record {object} - record to be upserted
 * @param table {string} - name of the table to upsert into
 * @param field {string} - name of the field that is to de used to determine existing record
 */
function createUpsert(record, table, field) {
    const vals_a = [];
    for (const item of record) {
        vals_a.push(format(item));
    }
    const vals = vals_a.join(", ");
    const sql = "insert into " + table + "(" + createListOfFields(record) + ") select " + vals +
        " from dual where not exists (select 1 from " + table +
        " where " + field + " = " + format(record[field]) + "); update " + table +
        " set " + createListOfSetValues(record) + " where " + field + " = " + format(record[field]) + ";";
    return sql;
}
exports.createUpsert = createUpsert;
/**
 * This method creates UPDATE statement for given object and given table.
 * @param record {object} - record to be updated. Must contain "id" field if query is not specified.
 * @param table {string} - name of the table where records should be updated
 * @param query {object} - query to find affected records.
 */
function createUpdate(record, table, query) {
    const vals_a = [];
    for (const i in record) {
        if (i === "id" && !query) {
            continue;
        }
        vals_a.push(i + " = " + format(record[i]));
    }
    const vals = vals_a.join(", ");
    let q_string = "";
    if (query) {
        q_string = mapQuery(query) + ";";
    }
    else {
        q_string = "where id = " + format(record.id) + ";";
    }
    const sql = `update ${table} set ${vals} ${q_string}`;
    return sql;
}
exports.createUpdate = createUpdate;
/**
 * This method creates UPDATE statement for given object and given table.
 * @param table {string} - name of the table where records should be updated
 * @param query {object} - query to find affected records.
 */
function createDelete(table, query) {
    const q_string = mapQuery(query);
    const sql = `delete from ${table} ${q_string}`;
    return sql.trim() + ";";
}
exports.createDelete = createDelete;
/**
 * This method creates SELECT statement for given object and given table.
 * @param fields {string[]} - list of field names to retrieve
 * @param table {string} - name of the table where records should be updated
 * @param query {object} - query to find affected records.
 * @param order_by {string[]} - optional list of field names to sort on ()
 * @param limit {number} - optional nukmber of records to retrieve
 */
function createSelect(fields, table, query, order_by, limit) {
    const q_string = mapQuery(query);
    const fields_s = fields.join(", ");
    const order_by_s = (order_by ? "order by " + order_by.join(", ") : "");
    const limit_s = (limit ? "limit " + limit : "");
    const sql = `select ${fields_s} from ${table} ${q_string} ${order_by_s} ${limit_s}`;
    return sql.trim() + ";";
}
exports.createSelect = createSelect;
//# sourceMappingURL=query_helper.js.map