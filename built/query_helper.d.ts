/**
 * Helper function that creates complex WHERE statement as string from given object
 * @param q {object} - complex query object
 */
export declare function mapQuery(q: any): string;
/**
 * This method inspects given record and constructs list of fields
 * that correspond to properties of the object.
 * @param record {object} - record to be inspected
 */
export declare function createListOfFields(record: any): string;
/**
 * This method inspects given record and constructs list of fields
 * that correspond to properties of the object.
 * @param record {object} - record to be inspected
 */
export declare function createListOfFieldValues(record: any): string;
export declare function createListOfSetValues(record: any): string;
/**
 * This method inspects given record and constructs list of fields
 * that correspond to properties of the object.
 * @param record {object} - record to be inspected
 */
export declare function createListOfFieldsRaw(record: any): any[];
/**
 * This method maps given record into an array of values that correspond to
 * field names, provided in parameter.
 * @param record {object} - record to be mapped
 * @param field_list {array} - list of field names
 */
export declare function mapObjectToArrayOfFields(record: any, field_list: any): any[];
/**
 * This method creates INSERT statement for given object and given table.
 * @param record {object} - record to be inserted
 * @param table {string} - name of the table to insert into
 */
export declare function createInsert(record: any, table: any): string;
/**
 * This method creates UPSERT statement for given object and given table.
 * @param record {object} - record to be upserted
 * @param table {string} - name of the table to upsert into
 */
export declare function createUpsert(record: any, table: any, field: any): string;
/**
 * This method creates UPDATE statement for given object and given table.
 * @param record {object} - record to be updated. Must contain "id" field if query is not specified.
 * @param table {string} - name of the table where records should be updated
 * @param query {object} - query to find affected records.
 */
export declare function createUpdate(record: any, table: any, query: any): string;
