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
export declare function createListOfFieldsRaw(record: any): string[];
/**
 * This method maps given record into an array of values that correspond to
 * field names, provided in parameter.
 * @param record {object} - record to be mapped
 * @param field_list {array} - list of field names
 */
export declare function mapObjectToArrayOfFields(record: any, field_list: string[]): any[];
/**
 * This method creates INSERT statement for given object and given table.
 * @param record {object} - record to be inserted
 * @param table {string} - name of the table to insert into
 */
export declare function createInsert(record: any, table: string): string;
/**
 * This method creates UPSERT statement for given object and given table.
 * @param record {object} - record to be upserted
 * @param table {string} - name of the table to upsert into
 * @param field {string} - name of the field that is to de used to determine existing record
 */
export declare function createUpsert(record: any, table: string, field: string): string;
/**
 * This method creates UPDATE statement for given object and given table.
 * @param record {object} - record to be updated. Must contain "id" field if query is not specified.
 * @param table {string} - name of the table where records should be updated
 * @param query {object} - query to find affected records.
 */
export declare function createUpdate(record: any, table: string, query: any): string;
/**
 * This method creates UPDATE statement for given object and given table.
 * @param table {string} - name of the table where records should be updated
 * @param query {object} - query to find affected records.
 */
export declare function createDelete(table: string, query: any): string;
/**
 * This method creates SELECT statement for given object and given table.
 * @param fields {string[]} - list of field names to retrieve
 * @param table {string} - name of the table where records should be updated
 * @param query {object} - query to find affected records.
 * @param order_by {string[]} - optional list of field names to sort on ()
 * @param limit {number} - optional nukmber of records to retrieve
 */
export declare function createSelect(fields: string[], table: string, query: any, order_by?: string[], limit?: number): string;
