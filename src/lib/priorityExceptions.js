import { normalizePriorityStages, stageInPeriod } from "./priorityStages.js";
export const PRIORITY_KEYS = ["specialRequest","promotion","plannedPgm","eventCard","captionRequest"];
const list = value => Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {}).filter(Boolean);
export function exceptionStages(settings) {
  if(settings.exceptionPriority?.schemaVersion===2)return list(settings.exceptionPriority.groups).flatMap(group=>
    list(group.stages).map(stage=>({...stage,startDate:group.startDate,endDate:group.endDate})));
  if(settings.exceptionPriority?.schemaVersion===1)return list(settings.exceptionPriority.stages);
  return list(settings.priorityExceptions).map((rule,index)=>({...rule,legacyIndex:index}))
    .sort((a,b)=>Number(a.beforeRank)-Number(b.beforeRank) || a.legacyIndex-b.legacyIndex)
    .map(({beforeRank,legacyIndex,...rule})=>rule);
}
export function resolvePriorityExceptions(settings,date,promotions,plannedPgms) {
  const base=[...new Set([...list(settings.priorityOrder).filter(key=>PRIORITY_KEYS.includes(key)),...PRIORITY_KEYS])];
  const candidates={promotion:promotions,plannedPgm:plannedPgms};
  const selected={promotion:promotions[0],plannedPgm:plannedPgms[0]},active={};
  if([4,5].includes(settings.exceptionPriority?.schemaVersion)) {
    const order=[],extraSources={};
    const periodMode=settings.exceptionPriority.schemaVersion===5;
    const group=periodMode ? list(settings.exceptionPriority.groups).find(item=>item.startDate && item.endDate && stageInPeriod(item,date)) : null;
    const stages=periodMode ? (group ? list(group.stages) : []) : list(settings.exceptionPriority.stages);
    normalizePriorityStages(stages,base).forEach((stage,index)=>{
      if(!periodMode && !stageInPeriod(stage,date))return;
      if(stage.targetType==="base"){order.push(stage.priorityKey);return;}
      if(!["promotion","plannedPgm"].includes(stage.targetType))return;
      const target=candidates[stage.targetType].find(item=>item.id && item.id===stage.targetId);
      if(!target)return;
      const key=`stage-${index}`;order.push(key);extraSources[key]=target;
    });
    return {...selected,order,extraSources,mixedStages:true};
  }
  if([1,2].includes(settings.exceptionPriority?.schemaVersion)) {
    const extraSources={},exceptionOrder=[];
    const selectedKinds=new Set();
    exceptionStages(settings).forEach((rule,index)=>{
      if(!["promotion","plannedPgm"].includes(rule.targetType) || !rule.startDate || !rule.endDate ||
        !/^\d{4}-\d{2}-\d{2}$/.test(rule.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(rule.endDate) ||
        rule.startDate>rule.endDate || !date || date<rule.startDate || date>rule.endDate)return;
      const target=candidates[rule.targetType].find(item=>item.id && item.id===rule.targetId);
      if(!target)return;
      const key=`exception-${index}`;
      extraSources[key]=target;exceptionOrder.push(key);
      if(!selectedKinds.has(rule.targetType)){selected[rule.targetType]=target;selectedKinds.add(rule.targetType);}
    });
    const cardExclusionOverride=exceptionOrder.some(key=>String(extraSources[key].material1 ?? "").trim() &&
      !["미운영","행사카드","자동적용"].includes(String(extraSources[key].material1).trim()));
    return {...selected,order:[...exceptionOrder,...base],extraSources,cardExclusionOverride};
  }
  list(settings.priorityExceptions).forEach(rule=>{
    const rank=Number(rule.beforeRank),kind=rule.targetType;
    if(!["promotion","plannedPgm"].includes(kind) || active[kind] || !date || !/^\d{4}-\d{2}-\d{2}$/.test(rule.startDate || "") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(rule.endDate || "") || rule.startDate>rule.endDate || date<rule.startDate || date>rule.endDate ||
      !Number.isInteger(rank) || rank<1 || rank>6 || rank-2>=base.indexOf(kind)) return;
    const target=candidates[kind].find(item=>item.id && item.id===rule.targetId);
    if(!target)return;
    selected[kind]=target;active[kind]={kind,anchor:base[rank-2],rank};
  });
  const position=kind=>active[kind] ? active[kind].rank-2.5 : base.indexOf(kind);
  const order=[...base].sort((a,b)=>position(a)-position(b) || base.indexOf(a)-base.indexOf(b));
  const cardExclusionOverride = order.some(kind=>active[kind]?.rank===1 &&
    String(selected[kind]?.material1 ?? "").trim() && !["미운영","행사카드","자동적용"].includes(String(selected[kind].material1).trim()));
  return {...selected,order,cardExclusionOverride};
}
