import test from "node:test";
import assert from "node:assert/strict";
import {normalizeMaterials,analyzeMaterials,buildConflictDisplayGroups,uniqueMaterialPairs,groupConflictMaterials,groupConflictIssues,buildSocketRuns,groupMaterialPeriods,validDate} from "../src/lib/materialConflicts.js";
const row=(id,start,end,material1,extra={})=>({id,promotionName:id,startDate:start,endDate:end,material1,...extra});
test("display allocates long-lived pair once and only new pairs to shorter bar",()=>{
  const rows=normalizeMaterials({promotion:[row("A","2026-11-01","2026-11-30","A"),row("B","2026-11-01","2026-11-30","B"),row("C","2026-11-08","2026-11-10","C")]});
  const raw=analyzeMaterials(rows,"2026-11-01","2026-11-30").issues;
  const display=buildConflictDisplayGroups(raw,rows);
  assert.deepEqual(display.map(group=>[group.start,group.end,group.materialPairs.map(pair=>pair.items.map(item=>item.code).join(":" )).sort()]),[
    ["2026-11-01","2026-11-30",["A:B"]],["2026-11-08","2026-11-10",["A:C","B:C"]]
  ]);
  assert.equal(raw.filter(issue=>issue.start<="2026-11-09"&&issue.end>="2026-11-09").length,3);
});
test("display merges alias overlap intervals but preserves gaps and separates sockets",()=>{
  const rows=normalizeMaterials({promotion:[row("A","2026-11-01","2026-11-30","A",{material2:"A"}),row("B1","2026-11-01","2026-11-10","B",{material2:"B"}),row("B2","2026-11-06","2026-11-15","B"),row("B3","2026-11-20","2026-11-22","B")]});
  const display=buildConflictDisplayGroups(analyzeMaterials(rows,"2026-11-01","2026-11-30").issues,rows);
  assert.deepEqual(display.map(group=>[group.slot,group.start,group.end]),[[1,"2026-11-01","2026-11-15"],[1,"2026-11-20","2026-11-22"],[2,"2026-11-01","2026-11-10"]]);
  assert.equal(new Set(display.flatMap(group=>group.materialPairs.map(pair=>pair.pairKey))).size,2);
});
test("independent oracle checks all combinations for 2 through 10 distinct codes",()=>{
  for(let n=2;n<=10;n++) {
    const rows=normalizeMaterials({promotion:Array.from({length:n},(_,i)=>row(`row${i}`,"2026-11-01","2026-11-30",`M${i}`))});
    const issues=analyzeMaterials(rows,"2026-11-01","2026-11-30").issues;
    const group=groupConflictIssues(issues)[0];
    assert.equal(groupConflictMaterials(group,issues,rows).length,n*(n-1)/2);
  }
});
test("seeded mixed periods and five sockets match an independent active-code oracle",()=>{
  let seed=91357;
  const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  const date=n=>`2026-11-${String(n).padStart(2,"0")}`;
  for(let fixture=0;fixture<500;fixture++) {
    const rows=normalizeMaterials({promotion:Array.from({length:3+random(8)},(_,i)=>{
      const from=1+random(20),to=from+random(31-from);
      return row(`r${i}`,date(from),date(to),"",Object.fromEntries([1,2,3,4,5].map(slot=>[`material${slot}`,random(4)?`M${random(5)}`:""])));
    })});
    const start=date(1+random(5)),end=date(25+random(6));
    const issues=analyzeMaterials(rows,start,end).issues;
    const groups=groupConflictIssues(issues);
    const display=buildConflictDisplayGroups(issues,rows);
    for(const group of groups) {
      // This oracle derives combinations from original schedules, without using
      // the pair-intersection or grouping implementation under test.
      const codes=[...new Set(rows.filter(row=>row.start<=group.start&&row.end>=group.end).map(row=>row.materials[group.slot-1]).filter(Boolean))].sort();
      const expected=codes.flatMap((code,i)=>codes.slice(i+1).map(other=>`${code}:${other}`)).sort();
      const actual=groupConflictMaterials(group,issues,rows).map(pair=>pair.items.map(item=>item.code).sort().join(":" )).sort();
      assert.deepEqual(actual,expected,`fixture ${fixture}, slot ${group.slot}, ${group.start}..${group.end}`);
    }
    // Every actual day/slot pair must be represented in at least one bar.
    for(let day=Number(start.slice(8));day<=Number(end.slice(8));day++)for(let slot=1;slot<=5;slot++) {
      const active=rows.filter(row=>row.start<=date(day)&&row.end>=date(day)&&row.materials[slot-1]);
      const codes=[...new Set(active.map(row=>row.materials[slot-1]))].sort();
      const expectedDisplay=codes.flatMap((code,i)=>codes.slice(i+1).map(other=>`${code}:${other}`)).sort();
      const actualDisplay=display.filter(group=>group.slot===slot&&group.start<=date(day)&&group.end>=date(day)).flatMap(group=>group.materialPairs.map(pair=>pair.items.map(item=>item.code).sort().join(":"))).sort();
      assert.deepEqual(actualDisplay,expectedDisplay,`display mismatch or duplicate, fixture ${fixture}, day ${day}, slot ${slot}`);
      const represented=new Set(groups.filter(group=>group.slot===slot&&group.start<=date(day)&&group.end>=date(day)).flatMap(group=>groupConflictMaterials(group,issues,rows).map(pair=>pair.items.map(item=>item.code).sort().join(":"))));
      codes.forEach((code,i)=>codes.slice(i+1).forEach(other=>assert.ok(represented.has(`${code}:${other}`),`missing day ${day}, slot ${slot}`)));
    }
  }
});
test("four distinct materials include all six pairs within a shorter selected overlap",()=>{
  const rows=normalizeMaterials({promotion:[row("Short","2026-11-11","2026-11-23","A"),row("Long1","2026-11-11","2026-11-30","B"),row("Long2","2026-11-11","2026-11-30","C"),row("Long3","2026-11-11","2026-11-30","D")]});
  const issues=analyzeMaterials(rows,"2026-11-01","2026-11-30").issues;
  const group=groupConflictIssues(issues).find(group=>group.end==="2026-11-23");
  const pairs=groupConflictMaterials(group,issues,rows);
  assert.equal(group.rows.length,4);
  assert.equal(group.issueIds.length,6);
  assert.equal(pairs.length,6);
  assert.equal(new Set(pairs.map(pair=>pair.items.map(item=>item.code).sort().join(":"))).size,6);
});
test("same socket and code use identical alias names across different period groups",()=>{
  const rows=normalizeMaterials({promotion:[row("Alpha","2026-11-01","2026-11-10","A"),row("Beta","2026-11-01","2026-11-10","B"),row("BetaAgain","2026-11-06","2026-11-08","B")]});
  const issues=analyzeMaterials(rows,"2026-11-01","2026-11-30").issues;
  const groups=groupConflictIssues(issues);
  const names=groups.map(group=>groupConflictMaterials(group,issues,rows)[0].items.find(item=>item.code==="B").name);
  assert.deepEqual(names,["Beta & BetaAgain","Beta & BetaAgain"]);
});
test("A versus B and B versus A count once within the same period and socket",()=>{
  const a={code:"A",name:"Alpha"},b={code:"B",name:"Beta"};
  const pair={slot:1,start:"2026-11-06",end:"2026-11-08",items:[a,b]};
  assert.equal(uniqueMaterialPairs([pair,{...pair,items:[b,a]}]).length,1);
  assert.equal(uniqueMaterialPairs([pair,{...pair,slot:2,items:[b,a]}]).length,2);
});
test("merges arbitrary names by material code and deduplicates material pairs",()=>{
  const rows=normalizeMaterials({promotion:[row("Alpha","2026-11-01","2026-11-10","A"),row("Beta","2026-11-01","2026-11-10","B"),row("Gamma","2026-11-01","2026-11-10","B"),row("Delta","2026-11-01","2026-11-10","C")]});
  const issues=analyzeMaterials(rows,"2026-11-01","2026-11-10").issues;
  const pairs=groupConflictMaterials(groupConflictIssues(issues)[0],issues);
  assert.equal(pairs.length,3);
  assert.equal(pairs[0].items.find(item=>item.code==="B").name,"Beta & Gamma");
  assert.equal(pairs[0].sourceIssueIds.length,2);
  assert.ok(pairs.every(pair=>pair.items[0].code!==pair.items[1].code));
});
test("combines multiple items for identical socket and overlap dates without merging different periods",()=>{
  const rows=normalizeMaterials({promotion:[row("a","2026-11-01","2026-11-10","A"),row("b","2026-11-01","2026-11-10","B"),row("c","2026-11-01","2026-11-10","B"),row("d","2026-11-06","2026-11-08","D")]});
  const groups=groupConflictIssues(analyzeMaterials(rows,"2026-11-01","2026-11-30").issues);
  assert.equal(groups.length,2);
  assert.deepEqual(groups.map(group=>[group.start,group.end,group.rows.length]),[["2026-11-01","2026-11-10",3],["2026-11-06","2026-11-08",4]]);
});
test("splits bars when participating items change even if conflict color stays the same",()=>{
  const rows=normalizeMaterials({promotion:[row("a","2026-11-01","2026-11-10","A"),row("b","2026-11-01","2026-11-10","B"),row("c","2026-11-06","2026-11-08","C")]});
  const analysis=analyzeMaterials(rows,"2026-11-01","2026-11-10");
  assert.deepEqual(buildSocketRuns(rows,analysis.issues,"2026-11-01","2026-11-10",1).map(run=>[run.start,run.end,run.tone,run.rows.length]),[
    ["2026-11-01","2026-11-05","conflict",2],["2026-11-06","2026-11-08","conflict",3],["2026-11-09","2026-11-10","conflict",2]
  ]);
});
test("groups concurrent promotions at inclusive start and end boundaries",()=>{
  const rows=normalizeMaterials({promotion:[row("a","2026-11-01","2026-11-10","A"),row("b","2026-11-06","2026-11-08","B")]});
  assert.deepEqual(groupMaterialPeriods(rows,"2026-11-01","2026-11-10").map(group=>[group.start,group.end,group.rows.map(row=>row.name)]),[
    ["2026-11-01","2026-11-05",["a"]],["2026-11-06","2026-11-08",["a","b"]],["2026-11-09","2026-11-10",["a"]]
  ]);
  assert.deepEqual(groupMaterialPeriods(rows,"2026-11-07","2026-11-07").map(group=>[group.start,group.end,group.rows.length]),[["2026-11-07","2026-11-07",2]]);
});
test("clips inclusive overlap to analysis window and compares each socket independently",()=>{
  const rows=normalizeMaterials({promotion:[row("a","2026-11-01","2026-11-10","A",{material2:"X"}),row("b","2026-11-06","2026-11-08","B",{material2:"X"})]});
  const result=analyzeMaterials(rows,"2026-11-07","2026-11-30");
  assert.equal(result.issues.length,2);assert.equal(result.affectedDays,2);
  assert.deepEqual(result.issues.map(i=>[i.type,i.start,i.end]),[["conflict","2026-11-07","2026-11-08"],["duplicate","2026-11-07","2026-11-08"]]);
  assert.equal(analyzeMaterials(rows,"2026-11-01","2026-11-30",2).issues.length,1);
});
test("separate intervals, invalid dates, control values and freeform notes do not create collisions",()=>{
  const rows=normalizeMaterials({promotion:[row("a","2026-11-01","2026-11-05","미운영",{note:"일반 비고"}),row("b","2026-11-06","2026-11-10","A"),row("bad","2026-02-30","2026-11-10","A")]});
  assert.equal(validDate("2026-02-30"),"");assert.equal(rows[2].invalid,true);assert.equal(rows[0].materials[4],"");
  assert.equal(analyzeMaterials(rows,"2026-11-01","2026-11-30").issues.length,0);
});
test("cross-type pairs and infinite end dates are clipped; affected days use union",()=>{
  const rows=normalizeMaterials({promotion:[row("a","2026-11-01","9999-12-31","A"),row("b","2026-11-06","2026-11-08","B")],plannedPgm:{x:{plannedPgmName:"PGM",startDate:"2026-11-08",endDate:"2026-11-10",material1:"C",note:"0F001385"}}});
  const result=analyzeMaterials(rows,"2026-11-01","2026-11-30");
  assert.equal(result.issues.length,3);assert.equal(result.affectedDays,5);assert.equal(rows[2].materials[4],"0F001385");
  assert.equal(analyzeMaterials(rows,"2026-12-01","2026-11-01").issues.length,0);
});
