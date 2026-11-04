export const BASE_STAGE_LABELS={cardExclusion:"카드배너 미적용 처리",specialRequest:"특수요청",plannedPgm:"기획PGM 전체",promotion:"프로모션 전체",eventCard:"행사카드",captionRequest:"주조자막의뢰정보"};
const keys=["cardExclusion","specialRequest","promotion","plannedPgm","eventCard","captionRequest"];
export function defaultPriorityStages(order=keys.slice(1)) {
  return [...new Set(["cardExclusion",...order,...keys])].filter(key=>keys.includes(key)).map(priorityKey=>({id:`base-${priorityKey}`,targetType:"base",priorityKey}));
}
export function normalizePriorityStages(stages,order) {
  const seen=new Set();
  return [...(stages || []).filter(stage=>{
    if(stage.targetType!=="base")return true;
    if(!keys.includes(stage.priorityKey) || seen.has(stage.priorityKey))return false;
    seen.add(stage.priorityKey);return true;
  }),...defaultPriorityStages(order).filter(stage=>!seen.has(stage.priorityKey))];
}
export function stageInPeriod(stage,date) {
  const valid=value=>!value || /^\d{4}-\d{2}-\d{2}$/.test(value);
  return Boolean(date && valid(stage.startDate) && valid(stage.endDate) &&
    (!stage.startDate || !stage.endDate || stage.startDate<=stage.endDate) &&
    (!stage.startDate || date>=stage.startDate) && (!stage.endDate || date<=stage.endDate));
}
