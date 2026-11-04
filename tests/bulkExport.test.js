import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import XLSX from "xlsx";
import CFB from "cfb";
import { createBulkXls, exportValues, outputRows, EXPORT_HEADERS } from "../src/lib/bulkExport.js";

const template=fs.readFileSync(new URL("../public/templates/BroadTimeSample.xls",import.meta.url));
const row=()=>{const v=Array(25).fill("");v[0]="1";v[1]="2026/11/03";v[2]="00:31:00";v[3]="01:31:00";v[20]="0F001149";v[21]="000123";v[24]="0F000005";return v;};
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
  assert.equal(sheet.B2.v,"00:31:00");assert.equal(sheet.E2.v,"000123");assert.equal(sheet.H2.v,"0F000005");
  const original=XLSX.read(template,{type:"buffer",cellStyles:true});
  assert.deepEqual(sheet.A1.s,original.Sheets.Sheet1.A1.s);
  assert.deepEqual(sheet["!cols"],original.Sheets.Sheet1["!cols"]);
});

const workbookRecords = file => {
  const container=CFB.read(file,{type:"array"});
  const bytes=Buffer.from(CFB.find(container,"Workbook").content);
  const records=[];
  for(let offset=0;offset+4<=bytes.length;){
    const type=bytes.readUInt16LE(offset),length=bytes.readUInt16LE(offset+2);
    if(!type && !length)break;
    records.push({type,payload:bytes.subarray(offset+4,offset+4+length)});
    offset+=4+length;
  }
  return records;
};
test("retains complete printer settings continuation and gives banner5 the body style",async()=>{
  const output=await createBulkXls(template,[row()]);
  const before=workbookRecords(template),after=workbookRecords(output);
  const printerData = records => {
    const start=records.findIndex(record=>record.type===0x004d);
    assert.ok(start>=0);
    const parts=[records[start].payload];
    for(let index=start+1;records[index]?.type===0x003c;index++)parts.push(records[index].payload);
    return Buffer.concat(parts);
  };
  assert.deepEqual(printerData(after),printerData(before));
  const cellXf=col=>after.find(record=>record.type===0x0204 && record.payload.readUInt16LE(0)===1 && record.payload.readUInt16LE(2)===col).payload.readUInt16LE(4);
  assert.equal(cellXf(7),cellXf(3));
  const sheet=XLSX.read(output,{type:"array",cellStyles:true,cellNF:true}).Sheets.Sheet1;
  assert.deepEqual(sheet.H2.s,sheet.D2.s);
  assert.equal(sheet.H2.z,"@");
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
