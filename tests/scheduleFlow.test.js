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
test("PGM배너여부 N does not suppress the independently scheduled event-card banner",()=>{
  const sourceHeaders=[...headers,"PGM배너여부"];
  const records=buildBulk(sourceHeaders,[[...row,"N"]],settings);
  assert.equal(records[0].values[11],"");
  assert.equal(records[0].values[20],"CARD");
  assert.equal(records[0].values[21],"PROMO-CI");
  const mdExcluded=buildBulk(sourceHeaders,[[...row,"N"]],{...settings,disabledMdCategories:[{mdCategory:"뷰티"}]});
  assert.equal(mdExcluded[0].values[11],"O");
  assert.equal(mdExcluded[0].values[20],"");
  const keywordExcluded=buildBulk([...sourceHeaders,"상품명"],[[...row,"N","스케쳐스 신발"]],{...settings,cardExcludedKeywords:[{keyword:"스케쳐스"}]});
  assert.equal(keywordExcluded[0].values[11],"O");
  assert.equal(keywordExcluded[0].values[20],"");
});
test("source exclusion-looking columns do not create rules outside operation settings",()=>{
  const sourceHeaders=[...headers,"PGM배너여부","카드배너제외여부","카드제외 여부"];
  const result=buildBulk(sourceHeaders,[[...row,"N","Y","O"]],settings)[0];
  assert.equal(result.values[11],"");
  assert.equal(result.values[20],"CARD");
});
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
test("default material validity includes boundary dates, supports open ends and preserves legacy undated settings",()=>{
  const run=defaults=>buildBulk(headers,[row],{defaultMaterials:[{materialType:"유형",material2:"CI",...defaults} ]})[0].values[21];
  assert.equal(run({startDate:"2026-11-03",endDate:"2026-11-03"}),"CI");
  assert.equal(run({startDate:"2026-11-04"}),"");
  assert.equal(run({endDate:"2026-11-02"}),"");
  assert.equal(run({startDate:"2026-11-01",endDate:""}),"CI");
  assert.equal(run({startDate:"",endDate:"2026-11-03"}),"CI");
  assert.equal(run({}),"CI");
  assert.equal(run({startDate:"2026-11-05",endDate:"2026-11-01"}),"");
  assert.equal(run({startDate:"invalid"}),"");
});
test("multiple reserved default settings switch by broadcast date, with deterministic overlap handling",()=>{
  const defaults=[
    {materialType:"유형",material2:"BASE"},
    {materialType:"유형",startDate:"2026-11-01",endDate:"2026-11-03",material2:"SETTING1"},
    {materialType:"유형",startDate:"2026-11-04",endDate:"2026-11-30",material2:"SETTING2"},
  ];
  const run=(date,config=defaults)=>{const source=[...row];source[0]=date;return buildBulk(headers,[source],{defaultMaterials:config})[0].values[21];};
  assert.equal(run("2026-11-03"),"SETTING1");assert.equal(run("2026-11-04"),"SETTING2");
  assert.equal(run("2026-12-01"),"BASE");
  assert.equal(run("2026-11-04",[...defaults,{...defaults[2],material2:"LATER"}]),"LATER");
  assert.equal(run("2026-12-01",defaults.slice(1)),"");
});
test("product keyword exclusions beat promotions, special requests and manual banner edits",()=>{
  const source=[...row,"[스케쳐스] 플렉스 부츠"];
  const config={...settings,cardExcludedKeywords:[{keyword:"스케쳐스"},{keyword:""}],specialRequests:[{pgmDateTime:"2026-11-03 01:31",programName:"상품A",material1:"SPECIAL-CARD",material2:"SPECIAL-CI"}]};
  const h=[...headers,"상품명"];
  const id=buildBulk(h,[source],config)[0].id;
  const result=buildBulk(h,[source],config,{overrides:{[id]:{20:"MANUAL-CARD",11:""}}})[0];
  assert.equal(result.values[11],"O");assert.equal(result.values[20],"");assert.equal(result.values[21],"SPECIAL-CI");
  assert.equal(buildMaster([result])[0][15],"");
  assert.equal(buildBulk(h,[[...row,"다른 상품"]],config)[0].values[20],"SPECIAL-CARD");
  const mixed={...settings,cardExcludedKeywords:[{keyword:"skeCHers"}]};
  assert.equal(buildBulk(h,[[...row,"SKECHERS shoes"]],mixed)[0].values[20],"");
});
test("card keyword exclusion matches product OR schedule name independently",()=>{
  const h=[...headers,"상품명"];
  const config={...settings,cardExcludedKeywords:[{keyword:"스케쳐스"},{keyword:"로보락"}]};
  const run=(scheduleName,productName)=>{
    const source=[...row,productName];source[headers.indexOf("편성코드명")]=scheduleName;
    return buildBulk(h,[source],config)[0].values;
  };
  for(const [scheduleName,productName] of [["스케쳐스 방송","브랜드 없는 신발"],["일반 방송","스케쳐스 신발"],["스케쳐스 방송","스케쳐스 신발"],["로보락 방송","청소기"],["스케쳐스 방송",""]]){
    const result=run(scheduleName,productName);
    assert.equal(result[11],"O");assert.equal(result[20],"");assert.equal(result[21],"PLANNED-CI");
  }
  const result=run("일반 방송","일반 상품");
  assert.equal(result[11],"");assert.equal(result[20],"CARD");
});
test("MD card exclusion remains above promotion and special-request priority",()=>{
  const config={...settings,disabledMdCategories:[{mdCategory:"뷰티"}],specialRequests:[{pgmDateTime:"2026-11-03 01:31",programName:"상품A",material1:"CARD",material2:"CI"}]};
  const record=buildBulk(headers,[row],config)[0];
  assert.equal(record.values[11],"O");assert.equal(record.values[20],"");assert.equal(record.values[21],"CI");
});
