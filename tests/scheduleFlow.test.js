import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBulk, buildMaster, MASTER_HEADERS } from "../src/lib/scheduleFlow.js";

const headers=["방송일자","방송시간","채널","편성코드","편성코드명","소재ID","상품코드","PGM명","영상명","MD분류","MD팀"];
const row=["2026-11-03","01:31 ~ 02:11","전체","123","상품A","0P001","456","기획A","영상A","뷰티","뷰티팀"];
const settings={
  defaultMaterials:[{materialType:"유형",material2:"BASE-CI"}],
  bannerSchedules:[{startDate:"2026-11-01",endDate:"2026-11-05",materialId:"CARD"}],
  promotion:[{startDate:"2026-11-01",endDate:"2026-11-05",programNames:[{value:"상품A"}],material2:"PROMO-CI"}],
  plannedPgm:[{plannedPgmName:"기획A",startDate:"2026-11-01",endDate:"2026-11-05",material2:"PLANNED-CI",material3:"L"}],
};
test("maps source fields, preserves unknown blanks and applies priority per slot",()=>{
  const bulk=buildBulk(headers,[row],settings);
  assert.equal(bulk[0].values[5],"뷰티팀");
  assert.deepEqual(bulk[0].values.slice(20,24),["CARD","PROMO-CI","L",""]);
  const master=buildMaster(bulk);
  assert.equal(master[0][3],"40");assert.equal(master[0][8],"");assert.equal(master[0][13],"");
  assert.equal(master[0][10],"123");assert.equal(master[0][12],"영상A");assert.equal(master[0][16],"");
  assert.equal(MASTER_HEADERS.length,24);
});
test("explicit special-request blanks clear all banners and datetime matching accepts slashes",()=>{
  const config={...settings,specialRequests:[{pgmDateTime:"2026/11/03 01:31",programName:"상품A",material3:"SPECIAL"}]};
  assert.deepEqual(buildBulk(headers,[row],config)[0].values.slice(20,24),["","","SPECIAL",""]);
});
test("changing priority changes material winner; date bounds prevent expired rules",()=>{
  const config={...settings,priorityOrder:["plannedPgm","promotion","eventCard","specialRequest","captionRequest"]};
  assert.equal(buildBulk(headers,[row],config)[0].values[21],"PLANNED-CI");
  const expired={...settings,promotion:[{...settings.promotion[0],endDate:"2026-11-02"}]};
  assert.equal(buildBulk(headers,[row],expired)[0].values[21],"PLANNED-CI");
});
test("manual blank override remains blank while other slots track changed settings",()=>{
  const base=buildBulk(headers,[row],settings)[0];
  const edits={overrides:{[base.id]:{21:""}}};
  const bulk=buildBulk(headers,[row],{...settings,plannedPgm:[{...settings.plannedPgm[0],material3:"NEW-L"}]},edits);
  assert.equal(bulk[0].values[21],"");assert.equal(bulk[0].values[22],"NEW-L");
});
test("ad is inserted before earliest PGM per day/hour with same start time; catalog fills ad fields",()=>{
  const later=[...row];later[1]="01:50 ~ 02:30";
  const day2=[...row];day2[0]="2026-11-04";
  const bulk=buildBulk(headers,[later,row,day2],settings);
  const master=buildMaster(bulk,{advertisements:[{startTime:"01:00",material:"AD"}],advertisementCatalog:[{material:"AD",materialName:"재난광고",durationSeconds:"35"}]});
  const ads=master.filter(r=>r[6]==="AD");assert.equal(ads.length,2);
  ads.forEach(ad=>{assert.equal(ad[2],"01:31:00");assert.equal(ad[3],"");assert.equal(ad[4],"35");assert.equal(ad[5],"01:31:35");assert.equal(ad[12],"재난광고");});
  assert.equal(master[2][6],"0P001");assert.equal(master[2][2],"01:31:00");
});
test("blank sources stay blank, empty ad rows are skipped, overnight durations wrap",()=>{
  assert.deepEqual(buildBulk(headers,[headers.map(()=>"")]),[]);
  const sparse=[...row];sparse[1]="";sparse[5]="";
  const master=buildMaster(buildBulk(headers,[sparse]),{advertisements:[{startTime:"01:00"}]});
  assert.equal(master.length,1);assert.equal(master[0][2],"");assert.equal(master[0][3],"");assert.equal(master[0][6],"");
  const overnight=[...row];overnight[1]="23:31 ~ 00:31";
  assert.equal(buildMaster(buildBulk(headers,[overnight]))[0][3],"60");
});
