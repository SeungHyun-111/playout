import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import XLSX from "xlsx";
import { createBulkXls, exportValues, outputRows, EXPORT_HEADERS } from "../src/lib/bulkExport.js";

const template=fs.readFileSync(new URL("../public/templates/BroadTimeSample.xls",import.meta.url));
const row=()=>{const v=Array(25).fill("");v[0]="1";v[1]="2026/11/03";v[2]="00:31:00";v[3]="01:31:00";v[20]="0F001149";v[21]="000123";v[24]="비고는 배너5가 아님";return v;};
test("exports real BIFF XLS with exact template headers and all data as @ text",async()=>{
  const source=[row()];const output=await createBulkXls(template,source);
  assert.equal(Buffer.from(output.subarray(0,8)).toString("hex"),"d0cf11e0a1b11ae1");
  const book=XLSX.read(output,{type:"array",cellNF:true,cellStyles:true});
  assert.deepEqual(book.SheetNames,["Sheet1"]);
  const sheet=book.Sheets.Sheet1;
  assert.deepEqual(XLSX.utils.sheet_to_json(sheet,{header:1,defval:""})[0],EXPORT_HEADERS);
  exportValues(source)[0].forEach((value,col)=>{
    const cell=sheet[XLSX.utils.encode_cell({r:1,c:col})];
    assert.equal(cell.t,"s");assert.equal(cell.z,"@");assert.equal(cell.v,value);
  });
  assert.equal(sheet.B2.v,"00:31:00");assert.equal(sheet.E2.v,"000123");assert.equal(sheet.H2.v,"");
  const original=XLSX.read(template,{type:"buffer",cellStyles:true});
  assert.deepEqual(sheet.A1.s,original.Sheets.Sheet1.A1.s);
  assert.deepEqual(sheet["!cols"],original.Sheets.Sheet1["!cols"]);
});
test("channels are dynamic exact values, including new groups and blanks",()=>{
  const rows=["1","2,3,4","1,2",""].map(channel=>{const v=row();v[0]=channel;return v;});
  assert.equal(outputRows(rows,["1,2"]).length,1);
  assert.equal(outputRows(rows,["1,2"])[0][0],"1,2");
  assert.equal(outputRows(rows,[]).length,0);assert.equal(outputRows(rows,[""]).length,1);
});
test("larger exports remove all sample records and preserve text beyond template row count",async()=>{
  const rows=Array.from({length:40},(_,i)=>{const v=row();v[20]=String(i).padStart(8,"0");return v;});
  const out=await createBulkXls(template,rows);
  const sheet=XLSX.read(out,{type:"array",cellNF:true}).Sheets.Sheet1;
  assert.equal(sheet["!ref"],"A1:H41");assert.equal(sheet.D41.v,"00000039");assert.equal(sheet.D41.z,"@");
  assert.equal(sheet.A42,undefined);
});
