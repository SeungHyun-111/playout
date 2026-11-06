export const CONFLICT_SESSION_ROOT='workspace/materialConflicts';
export const CONFLICT_SOURCES={promotion:'settings/promotion',plannedPgm:'settings/plannedPgm',bannerMaterials:'settings/bannerMaterials'};
export const decisionKey=pairId=>'d'+Array.from(new TextEncoder().encode(pairId),byte=>byte.toString(16).padStart(2,'0')).join('');
export function decisionRecord(pairId,choice,timestamp) {
  const [groupId,...materialCodes]=JSON.parse(pairId);
  const [slot,start,end]=groupId.split(':');
  return {pairId,choice:choice??null,slot:Number(slot),period:{start,end},materialCodes,sources:CONFLICT_SOURCES,updatedAt:timestamp};
}
export function restoreDecisions(records) {
  return Object.fromEntries(Object.values(records||{}).filter(record=>record&&typeof record.pairId==='string').map(record=>[record.pairId,record.choice??null]));
}
export function decisionSourceRows(pairId,settings) {
  const [groupId,...codes]=JSON.parse(pairId);
  const [slot,start,end]=groupId.split(':');
  return ['promotion','plannedPgm'].flatMap(type=>Object.entries(settings[type]||{}).filter(([,row])=>row&&validDate(row.startDate)<=end&&validDate(row.endDate)>=start).flatMap(([key,row])=>{
    const code=String(row[`material${slot}`]||(slot==='5'&&/^0F\d+$/i.test(String(row.note||'').trim())?row.note:'')).trim();
    return codes.includes(code)?[{path:`settings/${type}/${key}`,rowId:String(row.id||key),materialCode:code}]:[];
  }));
}
export function decisionUpdates(previous,next,timestamp) {
  const updates={};
  for(const pairId of new Set([...Object.keys(previous),...Object.keys(next)])){
    if(JSON.stringify(previous[pairId]??null)===JSON.stringify(next[pairId]??null))continue;
    updates[`decisions/${decisionKey(pairId)}`]=decisionRecord(pairId,next[pairId],timestamp);
  }
  return updates;
}
import {validDate} from './materialConflicts.js';
