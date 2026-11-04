import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBulk,buildMaster,MASTER_HEADERS } from "../src/lib/scheduleFlow.js";
import { applyMasterComments } from "../src/lib/masterComments.js";
import { buildArchiveUpdates } from "../src/lib/scheduleArchive.js";

const headers=["방송일자","방송시간","채널","소재ID","편성코드","편성코드명"];
const input=["2026-11-05","10:00 ~ 11:00","전체","0P001","123","방송A"];
const records=()=>buildBulk(headers,[input]);
test("manual comments start blank, survive regeneration and follow their row when ads are inserted",()=>{
  const original=buildMaster(records(),{},{structured:true});
  assert.equal(MASTER_HEADERS.at(-1),"편성팀 코멘트");assert.equal(original[0].values[24],"");
  const key=original[0].commentKey;
  const comments={[key]:"편성팀 확인\n추가 메모"};
  const regenerated=buildMaster(records(),{advertisements:[{id:"ad-1",startTime:"10:00",material:"AD1",durationSeconds:"30"}]},{structured:true});
  const result=applyMasterComments(regenerated,comments);
  assert.equal(result[0].kind,"advertisement");assert.equal(result[0].values[24],"");
  assert.equal(result[1].values[24],comments[key]);assert.equal(result[1].commentKey,key);
  assert.equal(original[0].values[24],"");
});
test("banner5 stays a material and comment is archived independently without becoming a duration",()=>{
  const bulk=records();bulk[0].values[24]="0F005";
  const entries=buildMaster(bulk,{},{structured:true});
  assert.equal(entries[0].values[23],"0F005");assert.equal(entries[0].values[24],"");
  const withComment=applyMasterComments(entries,{[entries[0].commentKey]:"직접 입력한 코멘트"});
  const result=buildArchiveUpdates({entries:withComment,versionId:"v1",savedAt:1,sourceSnapshot:{}});
  const event=result.updates["scheduleArchive/versions/2026-11-05/v1"].events.e000001;
  assert.equal(event.programmingComment,"직접 입력한 코멘트");
  const fifth=event.materials.find(item=>item.role==="banner5");
  assert.equal(fifth.materialId,"0F005");assert.equal(fifth.duration,"");
  assert.equal(event.rawValues[24],event.programmingComment);
});
test("distinct ads keep distinct comment keys and clearing a comment never changes other rows",()=>{
  const entries=buildMaster(records(),{advertisements:[{id:"one",startTime:"10:00",material:"AD1",durationSeconds:"15"},{id:"two",startTime:"10:00",material:"AD1",durationSeconds:"15"}]},{structured:true});
  assert.equal(new Set(entries.map(entry=>entry.commentKey)).size,3);
  const comments={[entries[0].commentKey]:"",[entries[1].commentKey]:"두 번째 광고"};
  const result=applyMasterComments(entries,comments);
  assert.equal(result[0].values[24],"");assert.equal(result[1].values[24],"두 번째 광고");assert.equal(result[2].values[24],"");
});
