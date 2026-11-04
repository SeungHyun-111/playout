import { test } from "node:test";
import assert from "node:assert/strict";
import { BULK_COLUMN_ORDER, BULK_VIEW_HEADERS, bulkViewValues, pasteBulkValues } from "../src/lib/bulkColumns.js";
import { exportValues } from "../src/lib/bulkExport.js";

test("visible columns move secondary fields after banner5 and omit the removed column",()=>{
  assert.equal(BULK_COLUMN_ORDER.length,24);
  assert.equal(new Set(BULK_COLUMN_ORDER).size,24);
  assert.ok(!BULK_COLUMN_ORDER.includes(15));
  assert.deepEqual(BULK_COLUMN_ORDER.slice(-7),[4,5,12,13,16,18,19]);
  assert.deepEqual(BULK_VIEW_HEADERS.slice(12,17),["플로팅배너1","플로팅배너2","플로팅배너3","플로팅배너4","비고(플로팅배너5)"]);
});
test("clipboard view and edits map back to stable saved columns including banners",()=>{
  const row=Array.from({length:25},(_,i)=>`v${i}`);
  const view=bulkViewValues(row);
  const pasted=Array(25).fill("");pasteBulkValues(pasted,view,0);
  assert.deepEqual(bulkViewValues(pasted),view);
  assert.equal(pasted[15],"");
  pasteBulkValues(pasted,["B1","B2","B3","B4","B5","VIDEO"],12);
  assert.deepEqual(exportValues([pasted])[0].slice(3),["B1","B2","B3","B4","B5"]);
  assert.equal(pasted[4],"VIDEO");
  assert.equal(pasted[5],"v5");
});
