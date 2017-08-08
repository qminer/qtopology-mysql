"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 */
function isObjectLike(value) {
    return !!value && typeof value == 'object';
}
/** `Object#toString` result references. */
let objectTag = '[object Object]';
/** Used for built-in method references. */
let objectProto = Object.prototype;
/** Used to resolve the decompiled source of functions. */
let funcToString = Function.prototype.toString;
/** Used to infer the `Object` constructor. */
let objectCtorString = funcToString.call(Object);
/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
let objectToString = objectProto.toString;
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
    if (value != null && typeof value.toString != 'function') {
        try {
            /*jshint -W018 */
            result = !!(value + '');
            /*jshint +W018 */
        }
        catch (e) {
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
    let proto = Object.getPrototypeOf(value);
    if (proto === null) {
        return true;
    }
    let Ctor = proto.constructor;
    return (typeof Ctor == 'function' && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
}
/**
 * Utility method that escapes string for SQL.
 */
function _escapeString(val) {
    val = val.replace(/[\0\n\r\b\t\\'\x1a]/g, function (s) {
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
    if (typeof value == 'string') {
        return "'" + _escapeString(value) + "'";
    }
    return value;
}
/**
 * This function formats given array of values into proper SQL.
 * @param value {array} - array of value
 */
function formatList(value) {
    let res = value.map(function (x) { return format(x); });
    return "(" + res.join(",") + ")";
}
/**
 * This function processes single condition.
 * @param key {object} - condition name (field). Can be null.
 * @param value {object} - condition value
 */
function processSingle(key, value) {
    let comparatorMap = {
        $eq: '=',
        $ne: '<>',
        $gte: '>=',
        $gt: '>',
        $lte: '<=',
        $lt: '<',
        $not: 'is not',
        $is: 'is',
        $like: 'like',
        $notLike: 'not like',
        $between: 'between',
        $notBetween: 'not between'
    };
    if (key === undefined && Array.isArray(value)) {
        key = '$and';
    }
    if (key === '$plain') {
        return value;
    }
    else if (key === '$or' || key === '$and' || key === '$not') {
        // OR/AND/NOT grouping logic
        let binding = (key === '$or') ? ' or ' : ' and ';
        let outerBinding = '';
        if (key === '$not')
            outerBinding = 'not ';
        if (Array.isArray(value)) {
            value = value.map(function (x) {
                let itemQuery = processObj(x, ' and ');
                if ((Array.isArray(x) || isPlainObject(x)) && x.length > 1) {
                    itemQuery = '(' + itemQuery + ')';
                }
                return itemQuery;
            }).filter(function (x) { return x && x.length; });
            return value.length ? outerBinding + '(' + value.join(binding) + ')' : undefined;
        }
        else {
            value = processObj(value, binding);
            return value ? outerBinding + '(' + value + ')' : undefined;
        }
    }
    else {
        if (value === undefined || value === null) {
            return key + " is null";
        }
        if (isPlainObject(value)) {
            let sub_items = [];
            for (let i in value) {
                if (i == "$in") {
                    sub_items.push(key + " in " + formatList(value[i]));
                }
                else {
                    sub_items.push(key + " " + comparatorMap[i] + " " + format(value[i]));
                }
            }
            sub_items = sub_items.filter(function (x) { return x && x.length; });
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
    let is_array = Array.isArray(obj);
    if ((is_array && obj.length === 0) ||
        //(_.isPlainObject(obj) && _.isEmpty(obj)) ||
        obj === null ||
        obj === undefined) {
        // NO OP
        return '';
    }
    let items = [];
    let binding = operator || 'and';
    if (binding.substr(0, 1) !== ' ')
        binding = ' ' + binding + ' ';
    if (is_array) {
        items.push(processSingle(undefined, obj));
    }
    else {
        for (let key in obj) {
            items.push(processSingle(key, obj[key]));
        }
    }
    // remove empty conditions
    items = items.filter(function (x) { return x && x.length; });
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
    let query = processObj(q, null);
    if (query && query.length) {
        return 'where ' + query;
    }
    return '';
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
    let fields = [];
    for (let i in record) {
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
    for (let i in record) {
        str += i + "=values(" + i + "), ";
    }
    return str.substring(0, str.length - 2);
}
exports.createListOfFieldValues = createListOfFieldValues;
function createListOfSetValues(record) {
    let str = "";
    for (let i in record) {
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
    let fields = [];
    for (let i in record) {
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
    let result = [];
    for (let i in field_list) {
        result.push(record[field_list[i]]);
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
    let vals_a = [];
    for (let i in record) {
        vals_a.push(format(record[i]));
    }
    let vals = vals_a.join(", ");
    let sql = "insert into " + table + "(" + createListOfFields(record) + ") values (" + vals + ");";
    return sql;
}
exports.createInsert = createInsert;
/**
 * This method creates UPSERT statement for given object and given table.
 * @param record {object} - record to be upserted
 * @param table {string} - name of the table to upsert into
 */
function createUpsert(record, table, field) {
    let vals_a = [];
    for (let i in record) {
        vals_a.push(format(record[i]));
    }
    let vals = vals_a.join(", ");
    let sql = "insert into " + table + "(" + createListOfFields(record) + ") select " + vals + " from dual where not exists (select 1 from " + table + " where " + field + " = " + format(record[field]) + "); update " + table + " set " + createListOfSetValues(record) + " where " + field + " = " + format(record[field]) + ";";
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
    let vals_a = [];
    for (let i in record) {
        if (i === "id" && !query) {
            continue;
        }
        vals_a.push(i + " = " + format(record[i]));
    }
    let vals = vals_a.join(", ");
    let q_string = "";
    if (query) {
        q_string = mapQuery(query) + ";";
    }
    else {
        q_string = "where id = " + format(record.id) + ";";
    }
    let sql = "update " + table + " set " + vals + " " + q_string;
    return sql;
}
exports.createUpdate = createUpdate;
//# sourceMappingURL=query_helper.js.map