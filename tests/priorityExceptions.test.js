import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBulk } from "../src/lib/scheduleFlow.js";
import { normalizePriorityStages } from "../src/lib/priorityStages.js";
const headers=["방송일자","방송시간","편성코드명","PGM명","MD분류","상품명"];
const input=["2026-11-05","10:00 ~ 11:00","상품A","기획A","보험","스케쳐스"];
const exception=(targetType="promotion",beforeRank=1)=>({id:"ex1",targetType,targetId:targetType==="promotion" ? "promo" : "planned",startDate:"2026-11-05",endDate:"2026-11-06",beforeRank});
const settings={
 promotion:[{id:"promo",promotionName:"프로모션A",programNames:[{value:"상품A"}],startDate:"2026-11-01",endDate:"2026-11-30",material1:"PROMO",material2:"PROMO-CI"}],
 plannedPgm:[{id:"planned",plannedPgmName:"기획A",startDate:"2026-11-01",endDate:"2026-11-30",material1:"PGM",material2:"PGM-CI"}],
 specialRequests:[{pgmDateTime:"2026-11-05 10:00",programName:"상품A",material1:"SPECIAL",material2:"SPECIAL-CI"}],
 disabledMdCategories:[{mdCategory:"보험"}],cardExcludedKeywords:[{keyword:"스케쳐스"}],
};
const run=(config,date="2026-11-05")=>buildBulk(headers,[[date,...input.slice(1)]],config)[0].values;
test("explicit before-1 promotion overrides MD and keyword exclusion and higher banner settings",()=>{
 assert.equal(run(settings)[20],"");
 const result=run({...settings,priorityExceptions:[exception()]});
 assert.equal(result[11],"");assert.equal(result[20],"PROMO");assert.equal(result[21],"PROMO-CI");
});
test("before-2 promotion wins over special requests but still respects card exclusion",()=>{
 const result=run({...settings,priorityExceptions:[exception("promotion",2)]});
 assert.equal(result[11],"O");assert.equal(result[20],"");assert.equal(result[21],"PROMO-CI");
});
test("date boundaries inclusive; outside period and unmatched IDs do not override exclusion",()=>{
 const config={...settings,priorityExceptions:[exception()]};
 assert.equal(run(config,"2026-11-06")[20],"PROMO");
 assert.equal(run(config,"2026-11-04")[11],"O");assert.equal(run(config,"2026-11-07")[20],"");
 assert.equal(run({...settings,priorityExceptions:[{...exception(),targetId:"missing"}]})[20],"");
 assert.equal(run({...settings,priorityExceptions:[{...exception(),startDate:""}]})[20],"");
});
test("planned PGM can precede #1; blank card slot does not revive a lower-priority card",()=>{
 assert.equal(run({...settings,priorityExceptions:[exception("plannedPgm")]})[20],"PGM");
 const config={...settings,promotion:[{...settings.promotion[0],material1:""}],priorityExceptions:[exception()]};
 const result=run(config);assert.equal(result[11],"O");assert.equal(result[20],"");assert.equal(result[21],"PROMO-CI");
});
test("overlapping exceptions use first valid setting; underlying matching conditions still required",()=>{
 const config={...settings,priorityExceptions:[exception("promotion",2),exception("promotion",1)]};
 assert.equal(run(config)[11],"O");
 const unmatched={...settings,promotion:[{...settings.promotion[0],programNames:[{value:"別番組"}]}],priorityExceptions:[exception()]};
 assert.equal(run(unmatched)[20],"");
});

const stage=(targetType,targetId)=>({id:targetId,targetType,targetId});
const group=stages=>({id:"openrun",name:"오픈런 기간",startDate:"2026-11-05",endDate:"2026-11-06",stages});
const grouped=(config,stages)=>({...config,exceptionPriority:{schemaVersion:2,groups:[group(stages)]}});
test("period stages apply planned PGM then promotion then base; moving stages changes the winner",()=>{
 const pgm=stage("plannedPgm","planned"),promo=stage("promotion","promo");
 const first=run(grouped(settings,[pgm,promo]));
 assert.equal(first[20],"PGM");assert.equal(first[21],"PGM-CI");assert.equal(first[11],"");
 const reversed=run(grouped(settings,[promo,pgm]));
 assert.equal(reversed[20],"PROMO");assert.equal(reversed[21],"PROMO-CI");
});
test("period stages leave nonmatching broadcasts and out-of-period dates on existing base rules",()=>{
 const config=grouped(settings,[stage("promotion","promo")]);
 assert.deepEqual(run(config,"2026-11-07"),run(settings,"2026-11-07"));
 const unrelated={...settings,promotion:[{...settings.promotion[0],programNames:[{value:"다른 방송"}]}]};
 assert.deepEqual(run(grouped(unrelated,[stage("promotion","promo")])),run(unrelated));
 assert.equal(run(config,"2026-11-06")[20],"PROMO");
});
test("multiple promotions can be stacked independently and blank fields fall through",()=>{
 const config={...settings,promotion:[{...settings.promotion[0],material1:"",material2:"TOP"},{...settings.promotion[0],id:"second",material1:"SECOND",material2:"LOW"}]};
 const result=run(grouped(config,[stage("promotion","promo"),stage("promotion","second")]));
 assert.equal(result[20],"SECOND");assert.equal(result[21],"TOP");
});
test("empty stage schema never revives legacy exceptions; higher period group wins overlaps",()=>{
 const legacy={...settings,priorityExceptions:[exception()]};
 assert.equal(run({...legacy,exceptionPriority:{schemaVersion:2}})[11],"O");
 const config={...settings,exceptionPriority:{schemaVersion:2,groups:[group([stage("plannedPgm","planned")]),group([stage("promotion","promo")])]}};
 assert.equal(run(config)[20],"PGM");
 config.exceptionPriority.groups.reverse();assert.equal(run(config)[20],"PROMO");
});

const base=priorityKey=>({id:priorityKey,targetType:"base",priorityKey});
const individual=(targetType,targetId,startDate="",endDate="")=>({id:`item-${targetId}`,targetType,targetId,startDate,endDate});
const mixed=(config,stages)=>({...config,exceptionPriority:{schemaVersion:4,stages}});
const userSequence=[base("cardExclusion"),base("specialRequest"),individual("plannedPgm","planned"),individual("promotion","promo","2026-11-05","2026-11-06"),base("plannedPgm"),base("promotion")];
test("unified order respects card exclusion then special request before individual promotions",()=>{
 const withExclusion=run(mixed(settings,userSequence));
 assert.equal(withExclusion[11],"O");assert.equal(withExclusion[20],"");assert.equal(withExclusion[21],"SPECIAL-CI");
 const withoutExclusion={...settings,disabledMdCategories:[],cardExcludedKeywords:[]};
 const special=run(mixed(withoutExclusion,userSequence));
 assert.equal(special[20],"SPECIAL");assert.equal(special[21],"SPECIAL-CI");
});
test("each item owns its period: long-lived planned PGM remains when short promotion expires",()=>{
 const clean={...settings,disabledMdCategories:[],cardExcludedKeywords:[],specialRequests:[],priorityOrder:["promotion","plannedPgm","specialRequest","eventCard","captionRequest"]};
 const sequence=[base("cardExclusion"),base("specialRequest"),individual("plannedPgm","planned","2026-11-01","2026-11-30"),individual("promotion","promo","2026-11-05","2026-11-06"),base("promotion"),base("plannedPgm")];
 assert.equal(run(mixed(clean,sequence),"2026-11-05")[20],"PGM");
 assert.equal(run(mixed(clean,sequence),"2026-11-07")[20],"PGM");
 const reversed=[sequence[0],sequence[1],sequence[3],sequence[2],...sequence.slice(4)];
 assert.equal(run(mixed(clean,reversed),"2026-11-05")[20],"PROMO");
 assert.equal(run(mixed(clean,reversed),"2026-11-07")[20],"PGM");
});
test("individual items override exclusion only when physically placed above its stage",()=>{
 const item=individual("promotion","promo");
 const top=run(mixed(settings,[item,base("cardExclusion"),base("specialRequest")]));
 assert.equal(top[20],"PROMO");assert.equal(top[11],"");
 const lower=run(mixed(settings,[base("cardExclusion"),item,base("specialRequest")]));
 assert.equal(lower[20],"");assert.equal(lower[11],"O");
});
test("missing basic rules are retained once and unrelated items leave defaults intact",()=>{
 const normalized=normalizePriorityStages([base("promotion"),base("promotion")]);
 assert.equal(normalized.filter(item=>item.targetType==="base").length,6);
 const cfg=mixed(settings,[individual("promotion","unknown")]);
 assert.deepEqual(run(cfg),run(settings));
});
test("period sequence mixes base rules and named items only within its shared dates",()=>{
 const clean={...settings,disabledMdCategories:[],cardExcludedKeywords:[],specialRequests:[],priorityOrder:["promotion","plannedPgm","specialRequest","eventCard","captionRequest"]};
 const config={...clean,exceptionPriority:{schemaVersion:5,groups:[{id:"period",startDate:"2026-11-05",endDate:"2026-11-06",stages:userSequence}]}};
 assert.equal(run(config,"2026-11-05")[20],"PGM");
 assert.equal(run(config,"2026-11-06")[20],"PGM");
 assert.deepEqual(run(config,"2026-11-07"),run(clean,"2026-11-07"));
 assert.deepEqual(run(config,"2026-11-04"),run(clean,"2026-11-04"));
 const exclusionConfig={...settings,exceptionPriority:config.exceptionPriority};
 assert.equal(run(exclusionConfig)[11],"O");assert.equal(run(exclusionConfig)[20],"");
});
test("shared period ignores obsolete per-item dates, handles overlapping groups and missing dates",()=>{
 const clean={...settings,specialRequests:[],disabledMdCategories:[],cardExcludedKeywords:[]};
 const promo={id:"first",startDate:"2026-11-05",endDate:"2026-11-06",stages:[individual("promotion","promo","2099-01-01","2099-01-02")]};
 const pgm={...promo,id:"second",stages:[individual("plannedPgm","planned")]};
 const config={...clean,exceptionPriority:{schemaVersion:5,groups:[promo,pgm]}};
 assert.equal(run(config)[20],"PROMO");
 config.exceptionPriority.groups.reverse();assert.equal(run(config)[20],"PGM");
 config.exceptionPriority.groups=[{...promo,startDate:""}];assert.deepEqual(run(config),run(clean));
 config.exceptionPriority.groups=[];assert.deepEqual(run(config),run(clean));
});
