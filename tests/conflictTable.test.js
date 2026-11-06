import test from 'node:test';
import assert from 'node:assert/strict';
import {sortConflictRows,createConflictWorkbook} from '../src/lib/conflictTable.js';
const rows=[{id:'a',type:'프로모션',name:'항목10',start:'2026-11-10',end:'2026-11-20',materials:['ID10','','','',''],shoppingSubsidy:'5,000',rewardPoints:'',cardBillingDiscount:'7%',otherBenefits:''},{id:'b',type:'PGM',name:'항목2',start:'2026-02-01',end:'2026-02-03',materials:['ID2','','','',''],shoppingSubsidy:'',rewardPoints:'1000',cardBillingDiscount:'',otherBenefits:''}];
test('sorts dates chronologically and displayed material names independently of IDs',()=>{
  assert.deepEqual(sortConflictRows(rows,{key:'period',direction:'asc'}).map(row=>row.id),['b','a']);
  assert.deepEqual(sortConflictRows(rows,{key:'period',direction:'desc'}).map(row=>row.id),['a','b']);
  const independent=[{...rows[0],start:'2026-01-01',end:'2026-12-31'},{...rows[1],start:'2026-02-01',end:'2026-03-01'}];
  assert.deepEqual(sortConflictRows(independent,{key:'start',direction:'asc'}).map(row=>row.id),['a','b']);
  assert.deepEqual(sortConflictRows(independent,{key:'end',direction:'asc'}).map(row=>row.id),['b','a']);
  assert.deepEqual(sortConflictRows(independent,{key:'end',direction:'desc'}).map(row=>row.id),['a','b']);
  assert.deepEqual(sortConflictRows(rows,{key:'material1',direction:'asc'}).map(row=>row.id),['b','a']);
  assert.deepEqual(sortConflictRows(rows,{key:'material1',direction:'asc'},{ID10:'가',ID2:'하'},true).map(row=>row.id),['a','b']);
});
test('xlsx preserves actual dates, benefits and distinct populated/empty styles after serialization',async()=>{
  const workbook=await createConflictWorkbook({mode:'all',groups:[],rows,names:{ID10:'소재 열'},showNames:true});
  const ExcelJS=(await import('exceljs')).default;
  const loaded=new ExcelJS.Workbook();await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet=loaded.worksheets[0];
  assert.equal(sheet.getCell('C2').value.toISOString().slice(0,10),'2026-11-10');
  assert.equal(sheet.getCell('C2').numFmt,'yyyy-mm-dd');
  assert.equal(sheet.getCell('E2').value,'소재 열');
  assert.equal(sheet.getCell('J2').value,'5,000');
  assert.notEqual(sheet.getCell('E2').fill.fgColor.argb,sheet.getCell('F2').fill.fgColor.argb);
  assert.equal(sheet.autoFilter,'A1:M1');
});
test('period export merges group date cells and retains row date types',async()=>{
  const workbook=await createConflictWorkbook({mode:'period',groups:[{start:'2026-11-01',end:'2026-11-30',rows}],rows:[],names:{},showNames:false});
  const sheet=workbook.worksheets[0];
  assert.ok(sheet.getCell('A3').isMerged);
  assert.equal(sheet.getCell('E2').value.toISOString().slice(0,10),'2026-11-10');
  assert.equal(sheet.getCell('G2').value,'ID10');
});
