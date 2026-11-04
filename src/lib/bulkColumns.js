import { BULK_HEADERS } from "./scheduleFlow.js";

// Keep persisted column IDs stable; arrange the editable view and clipboard here.
// Slot 15 was removed from the UI and remains reserved in existing saved arrays.
export const BULK_COLUMN_ORDER = [0,1,2,3,6,7,8,9,10,11,14,17,20,21,22,23,24,4,5,12,13,16,18,19];
export const BULK_VIEW_HEADERS = BULK_COLUMN_ORDER.map(column=>BULK_HEADERS[column]);
export const bulkViewValues = row => BULK_COLUMN_ORDER.map(column=>String(row[column] ?? ""));
export function pasteBulkValues(target,values,startColumn) {
  values.forEach((value,index)=>{target[BULK_COLUMN_ORDER[startColumn+index]]=value;});
}
