const list = value => Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {}).filter(Boolean);
const text = value => String(value ?? "").trim();
export function validDate(value) {
  const match = text(value).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return "";
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T00:00:00Z`);
  return Number.isFinite(+date) && date.getUTCFullYear() === +y && date.getUTCMonth()+1 === +m && date.getUTCDate() === +d ? date.toISOString().slice(0,10) : "";
}
export const dayNumber = date => Date.parse(`${date}T00:00:00Z`) / 86400000;
export const dateFromDay = day => new Date(day * 86400000).toISOString().slice(0,10);
// Presentation allocation is independent from raw, date-active conflict data.
export function buildConflictDisplayGroups(issues, catalogRows) {
  const byPair=new Map();
  issues.filter(issue=>issue.type==="conflict").forEach(issue=>{
    const codes=[issue.a.materials[issue.slot-1],issue.b.materials[issue.slot-1]].sort();
    const pairKey=JSON.stringify([issue.slot,...codes]);
    if(!byPair.has(pairKey))byPair.set(pairKey,{slot:issue.slot,codes,pairKey,intervals:[]});
    byPair.get(pairKey).intervals.push(issue);
  });
  const groups=new Map();
  byPair.forEach(({slot,codes,pairKey,intervals})=>{
    const merged=[];
    [...intervals].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)).forEach(issue=>{
      const previous=merged.at(-1);
      if(previous&&dayNumber(issue.start)<=dayNumber(previous.end)+1){
        previous.end=previous.end>issue.end?previous.end:issue.end;
        previous.sources.push(issue);
      }else merged.push({start:issue.start,end:issue.end,sources:[issue]});
    });
    merged.forEach(({start,end,sources})=>{
      const id=`${slot}:${start}:${end}`;
      if(!groups.has(id))groups.set(id,{id,slot,start,end,type:"conflict",rows:[],issueIds:[],materialPairs:[]});
      const group=groups.get(id);
      const members=[...new Map(sources.flatMap(issue=>[issue.a,issue.b]).map(row=>[row.id,row])).values()];
      const items=codes.map(code=>({
        id:code,code,
        rowIds:members.filter(row=>row.materials[slot-1]===code).map(row=>row.id),
        name:[...new Set(catalogRows.filter(row=>row.materials[slot-1]===code).map(row=>row.name))].sort((a,b)=>a.localeCompare(b,"ko")).join(" & ")
      }));
      group.materialPairs.push({id:JSON.stringify([id,...codes]),pairKey,items,sourceIssueIds:sources.map(issue=>issue.id)});
      group.rows=[...new Map([...group.rows,...members].map(row=>[row.id,row])).values()];
      group.issueIds=[...new Set([...group.issueIds,...sources.map(issue=>issue.id)])];
    });
  });
  return [...groups.values()].sort((a,b)=>a.slot-b.slot||a.start.localeCompare(b.start)||b.end.localeCompare(a.end));
}
export function uniqueMaterialPairs(pairs) {
  const unique=new Map();
  pairs.forEach(pair=>{
    const codes=pair.items.map(item=>item.code).sort();
    const key=JSON.stringify([pair.slot,pair.start,pair.end,...codes]);
    if(!unique.has(key))unique.set(key,{...pair,id:key,items:[...pair.items].sort((a,b)=>a.name.localeCompare(b.name,"ko"))});
  });
  return [...unique.values()];
}
export function groupConflictIssues(issues) {
  const groups = new Map();
  issues.filter(issue=>issue.type==="conflict").forEach(issue=>{
    const id=`${issue.slot}:${issue.start}:${issue.end}`;
    if (!groups.has(id)) groups.set(id,{id,slot:issue.slot,start:issue.start,end:issue.end,type:"conflict",rows:[],issueIds:[]});
    const group=groups.get(id);
    group.issueIds.push(issue.id);
    [issue.a,issue.b].forEach(row=>{if(!group.rows.some(existing=>existing.id===row.id))group.rows.push(row);});
  });
  groups.forEach(group=>{
    // A selected interval must include all pairs valid throughout that interval,
    // including pairs whose overlap extends beyond the selected bar.
    const included=issues.filter(issue=>issue.type==="conflict"&&issue.slot===group.slot&&issue.start<=group.start&&issue.end>=group.end);
    group.rows=[...new Map(included.flatMap(issue=>[issue.a,issue.b]).map(row=>[row.id,row])).values()];
    group.issueIds=included.map(issue=>issue.id);
  });
  return [...groups.values()].sort((a,b)=>a.slot-b.slot||a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
}
export function groupConflictMaterials(group, issues, catalogRows=group.rows) {
  const materials=new Map();
  group.rows.forEach(row=>{
    const code=row.materials[group.slot-1];
    if(!materials.has(code))materials.set(code,{id:code,code,names:[],rowIds:[]});
    const item=materials.get(code);
    if(!item.names.includes(row.name))item.names.push(row.name);
    item.rowIds.push(row.id);
  });
  // Keep one display identity for a socket/material across all period groups.
  materials.forEach((item,code)=>{
    const aliases=catalogRows.filter(row=>row.materials[group.slot-1]===code);
    item.names=[...new Set(aliases.map(row=>row.name))].sort((a,b)=>a.localeCompare(b,"ko"));
  });
  const pairs=new Map();
  issues.filter(issue=>group.issueIds.includes(issue.id)).forEach(issue=>{
    const codes=[issue.a.materials[group.slot-1],issue.b.materials[group.slot-1]].sort();
    if(codes[0]===codes[1])return;
    const id=JSON.stringify([group.id,...codes]);
    if(!pairs.has(id))pairs.set(id,{id,items:codes.map(code=>({...materials.get(code),name:materials.get(code).names.join(" & ")})),sourceIssueIds:[]});
    pairs.get(id).sourceIssueIds.push(issue.id);
  });
  return [...pairs.values()];
}
export function buildSocketRuns(rows, issues, start, end, slot) {
  return groupMaterialPeriods(rows.filter(row=>row.materials[slot-1]),start,end).filter(group=>group.rows.length).map(group=>{
    const matches=issues.filter(issue=>issue.slot===slot&&issue.start<=group.end&&issue.end>=group.start);
    return {...group, offset:dayNumber(group.start)-dayNumber(start),length:dayNumber(group.end)-dayNumber(group.start)+1,
      tone:matches.some(issue=>issue.type==="conflict")?"conflict":matches.length?"duplicate":"normal"};
  });
}
export function groupMaterialPeriods(rows, start, end) {
  if (!validDate(start) || !validDate(end) || start > end) return [];
  const first = dayNumber(start), last = dayNumber(end);
  const active = rows.filter(row => !row.invalid && row.start <= end && row.end >= start);
  const boundaries = [...new Set([first,last+1,...active.flatMap(row => [Math.max(first,dayNumber(row.start)),Math.min(last,dayNumber(row.end))+1])])].sort((a,b)=>a-b);
  return boundaries.slice(0,-1).map((day,index)=>({start:dateFromDay(day),end:dateFromDay(boundaries[index+1]-1),rows:active.filter(row=>dayNumber(row.start)<=day && dayNumber(row.end)>=day)}));
}
export function normalizeMaterials(settings) {
  return [ ["promotion", "프로모션", "promotionName"], ["plannedPgm", "PGM", "plannedPgmName"] ].flatMap(([key,type,name]) => list(settings[key]).filter(row => text(row[name])).map((row,index) => {
    const start = validDate(row.startDate), end = validDate(row.endDate);
    return { id: `${key}-${row.id || index}`, type, name: text(row[name]), start, end,
      invalid: !start || !end || start > end,
      materials: [1,2,3,4,5].map(slot => {
        const value = text(row[`material${slot}`] || (slot === 5 && /^0F\d+$/i.test(text(row.note)) ? row.note : ""));
        return ["-", "미운영", "자동적용", "행사카드"].includes(value) ? "" : value;
      }), note: text(row.note), shoppingSubsidy:text(row.shoppingSubsidy),rewardPoints:text(row.rewardPoints),cardBillingDiscount:text(row.cardBillingDiscount),otherBenefits:text(row.otherBenefits) };
  }));
}
export function analyzeMaterials(rows, start, end, socket = 0) {
  if (!validDate(start) || !validDate(end) || start > end) return {rows:[], issues:[], affectedDays:0};
  const active = rows.filter(row => !row.invalid && row.start <= end && row.end >= start && (!socket || row.materials[socket-1]));
  const issues = [];
  active.forEach((a,i) => active.slice(i+1).forEach(b => {
    const from = [start,a.start,b.start].sort().at(-1), to = [end,a.end,b.end].sort()[0];
    if (from > to) return;
    for (let slot=1;slot<=5;slot++) {
      if (socket && slot !== socket) continue;
      const x=a.materials[slot-1], y=b.materials[slot-1];
      if (!x || !y) continue;
      issues.push({id:`${a.id}:${b.id}:${slot}`, a,b,slot,start:from,end:to,type:x===y?"duplicate":"conflict"});
    }
  }));
  const ranges=issues.map(issue=>[dayNumber(issue.start),dayNumber(issue.end)]).sort((a,b)=>a[0]-b[0]);
  let affectedDays=0, last=-Infinity;
  ranges.forEach(([from,to])=>{affectedDays+=Math.max(0,to-Math.max(from,last+1)+1);last=Math.max(last,to);});
  return {rows:active,issues,affectedDays};
}
