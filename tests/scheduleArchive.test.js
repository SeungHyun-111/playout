import { test } from "node:test";
import assert from "node:assert/strict";
import { buildArchiveUpdates, replaceArchiveVersions, searchKey } from "../src/lib/scheduleArchive.js";
import { buildBulk, buildMaster } from "../src/lib/scheduleFlow.js";

const makeEntries = () => buildMaster(buildBulk(
  ["방송일자","방송시간","채널","소재ID","편성코드","PGM명"],
  [["2026-11-04","23:30 ~ 00:30","2,3","MAIN/.#","PGM1","방송A"],
   ["2026-11-05","01:00 ~ 02:00","전체","MAIN/.#","PGM1","방송A"]],
  {defaultMaterials:[{materialType:"유형",material2:"CI"}]}
),{}, {structured:true});

test('latest-only replacement removes old versions and removed material indexes without conflicting paths', () => {
  const entries = makeEntries().slice(0, 1);
  const old = buildArchiveUpdates({ entries, versionId: 'v1', savedAt: 1, sourceSnapshot: {} });
  const previous = { '2026-11-04': { v1: old.updates['scheduleArchive/versions/2026-11-04/v1'] } };
  const nextEntries = entries.map(entry => ({ ...entry, values: entry.values.map((value, col) => col === 6 ? 'NEW' : value) }));
  const next = buildArchiveUpdates({ entries: nextEntries, versionId: 'current', savedAt: 2, sourceSnapshot: {} });
  const updates = replaceArchiveVersions(next.updates, previous);
  assert.equal(updates['scheduleArchive/versions/2026-11-04/v1'], null);
  assert.equal(updates[`scheduleArchive/materialUsage/${searchKey('MAIN/.#')}/2026-11-04/v1`], null);
  assert.ok(updates[`scheduleArchive/materialUsage/${searchKey('NEW')}/2026-11-04/current`]);
  const current = next.updates['scheduleArchive/versions/2026-11-04/current'];
  const again = replaceArchiveVersions(next.updates, { '2026-11-04': { current } });
  assert.ok(again['scheduleArchive/versions/2026-11-04/current'].events);
  const paths = Object.keys(again);
  assert.ok(paths.every(path => !paths.some(other => other.startsWith(path + '/'))));
  assert.ok(paths.every(path => !path.includes('2026-11-05')));
});

test("archives selected days with named fields and matching material and program references",()=>{
  const entries=makeEntries();
  const {updates,dates}=buildArchiveUpdates({entries,versionId:"v1",savedAt:123,sourceSnapshot:{settings:{}}});
  assert.deepEqual(dates,["2026-11-04","2026-11-05"]);
  const archived=updates["scheduleArchive/versions/2026-11-04/v1"];
  assert.equal(archived.events.e000001.channel,"2,3");
  assert.equal(archived.events.e000001.scheduledEndTime,"00:30:00");
  assert.equal(archived.events.e000001.status,"scheduled");
  assert.equal(archived.materialUsageCount,2);
  assert.equal(updates[`scheduleArchive/materialUsage/${searchKey("MAIN/.#")}/2026-11-04/v1/e000001_0`].eventId,"e000001");
  assert.equal(updates["scheduleArchive/programUsage/k50474d31/2026-11-04/v1/e000001"].programName,"방송A");
  assert.equal(updates["scheduleArchive/dates/2026-11-04"].versionId,"v1");
});

test("new versions preserve old index paths while latest pointer changes; removed materials are not current",()=>{
  const entries=makeEntries().slice(0,1);
  const old=buildArchiveUpdates({entries,versionId:"old",savedAt:1,sourceSnapshot:{}}).updates;
  const changed=structuredClone(entries);changed[0].values[6]="NEW";
  const next=buildArchiveUpdates({entries:changed,versionId:"new",savedAt:2,sourceSnapshot:{}}).updates;
  const combined={...old,...next};
  assert.ok(combined[`scheduleArchive/materialUsage/${searchKey("MAIN/.#")}/2026-11-04/old/e000001_0`]);
  assert.equal(combined["scheduleArchive/dates/2026-11-04"].versionId,"new");
  assert.equal(next[`scheduleArchive/materialUsage/${searchKey("MAIN/.#")}/2026-11-04/new/e000001_0`],undefined);
});

test("invalid rows prevent the entire save and keys preserve exact IDs safely",()=>{
  const entries=makeEntries();entries[1].values[1]="";
  assert.throws(()=>buildArchiveUpdates({entries,versionId:"v",savedAt:1,sourceSnapshot:{}}),/放送|방송일자/);
  assert.doesNotMatch(searchKey("한글/.#$[]"),/[/.#$\[\]]/);
  assert.notEqual(searchKey("001"),searchKey("1"));
});
