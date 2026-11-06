import test from 'node:test';
import assert from 'node:assert/strict';
import {decisionKey,decisionRecord,decisionUpdates,restoreDecisions,decisionSourceRows} from '../src/lib/conflictSession.js';
const id='["2:2026-11-01:2026-11-10","0F001346","0F001377"]';
test('decisions link to exact RTDB source rows by socket, code and overlapping dates',()=>{
  const settings={promotion:[{id:'p1',startDate:'2026-11-01',endDate:'2026-11-10',material2:'0F001377'}],plannedPgm:{pgm:{id:'g1',startDate:'2026-11-01',endDate:'2026-11-10',material2:'0F001346'},expired:{startDate:'2026-10-01',endDate:'2026-10-10',material2:'0F001346'}}};
  assert.deepEqual(decisionSourceRows(id,settings).map(row=>row.path),['settings/promotion/0','settings/plannedPgm/pgm']);
});
test('decision keys are RTDB-safe and records retain period/material/source relationships',()=>{
  assert.ok(!/[.#$\[\]\/]/.test(decisionKey(id)));
  const record=decisionRecord(id,{type:'custom',value:'한글 입력'},123);
  assert.equal(record.slot,2);assert.equal(record.period.start,'2026-11-01');
  assert.deepEqual(record.materialCodes,['0F001346','0F001377']);
  assert.equal(record.sources.plannedPgm,'settings/plannedPgm');
  assert.deepEqual(restoreDecisions({[decisionKey(id)]:record}),{[id]:{type:'custom',value:'한글 입력'}});
});
test('choice patches update only changed decisions and preserve explicit no-selection',()=>{
  const other='["1:2026-11-01:2026-11-30","A","B"]';
  const updates=decisionUpdates({[id]:'A',[other]:'B'},{[id]:null,[other]:'B'},1);
  assert.deepEqual(Object.keys(updates),[`decisions/${decisionKey(id)}`]);
  assert.equal(updates[`decisions/${decisionKey(id)}`].choice,null);
  assert.deepEqual(restoreDecisions(updates),{[id]:null});
});
