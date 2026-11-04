import { useEffect, useState } from "react";
import "../styles/compact-exceptions.css";
import CompactPriorityList, { ActivityBadge } from "./CompactPriorityList.jsx";
import FlexibleDateInput from "./FlexibleDateInput.jsx";
import useNewItemMarker from "../hooks/useNewItemMarker.js";
import { normalizePriorityStages } from "../lib/priorityStages.js";
const list=value=>Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {}).filter(Boolean);

export function toPriorityStages(config,legacyStages,baseOrder) {
  const stages=config?.schemaVersion===4 ? list(config.stages) : legacyStages.map(({beforeRank,...stage})=>stage);
  return normalizePriorityStages(stages,baseOrder);
}
const stripDates=stages=>stages.map(({startDate,endDate,...stage})=>stage);
export function toPeriodGroups(config,legacyStages,baseOrder) {
  if(config?.schemaVersion===5 || config?.schemaVersion===2)return list(config.groups).map(group=>({...group,stages:stripDates(normalizePriorityStages(list(group.stages),baseOrder))}));
  if(config?.schemaVersion===4)return [{id:"imported-order",name:"기존 순서",startDate:"",endDate:"",stages:stripDates(toPriorityStages(config,legacyStages,baseOrder))}];
  return legacyStages.map((stage,index)=>({id:stage.id || `legacy-${index}`,name:`기존 예외 ${index+1}`,startDate:stage.startDate || "",endDate:stage.endDate || "",stages:stripDates(normalizePriorityStages([stage],baseOrder))}));
}
const STORAGE_KEY="playout.exceptionPeriods.collapsed";
export default function ExceptionSettings({groups,setGroups,promotions,plannedPgms,baseOrder,isLegacy}) {
  const {marks,markNew,markChange,register}=useNewItemMarker(groups);
  const [collapsed,setCollapsed]=useState(()=>{
    try {const value=JSON.parse(sessionStorage.getItem(STORAGE_KEY));return value && typeof value==="object" && !Array.isArray(value) ? value : {};}catch{return {};}
  });
  useEffect(()=>{try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(collapsed));}catch{/* Optional UI state. */}},[collapsed]);
  const addPeriod=source=>{
    const id=crypto.randomUUID();
    const group=source ? {...source,id,name:`${source.name || "기간 설정"} 복사`,startDate:"",endDate:"",stages:source.stages.map(stage=>({...stage,id:stage.targetType==="base" ? stage.id : crypto.randomUUID()}))} : {id,name:"",startDate:"",endDate:"",stages:normalizePriorityStages([],baseOrder)};
    setCollapsed(current=>({...current,[id]:false}));markNew(id);setGroups(current=>[group,...current]);
  };
  const change=(id,fields)=>{markChange(id,"edited");setGroups(current=>current.map(group=>group.id===id ? {...group,...fields} : group));};
  const move=(index,offset)=>{
    const to=index+offset;if(to<0 || to>=groups.length)return;
    markChange(groups[index].id,"moved");setGroups(current=>{const next=[...current],[group]=next.splice(index,1);next.splice(to,0,group);return next;});
  };
  const setAll=closed=>setCollapsed(Object.fromEntries(groups.map(group=>[group.id,closed])));
  return <section className="exception-stage-board compact-exception-board" data-coach="operation-settings-panel">
    <div className="periods-page-toolbar"><div><h2>기간별 우선순위 <small>{groups.length}개 기간 · 자동 저장</small></h2></div><div className="compact-row-actions">
      <button type="button" onClick={()=>setAll(false)}>전체 펼치기</button><button type="button" onClick={()=>setAll(true)}>전체 접기</button>
      <details className="periods-help"><summary>도움말</summary><div className="periods-help-content">
        <strong>기간 이름을 눌러 열고 닫기</strong><p>펼친 뒤 이름·날짜를 수정하고, 기본 규칙과 개별 항목을 위아래로 정렬하세요. 새 기간과 항목은 맨 위에 추가됩니다.</p>
        <strong>적용 방식</strong><p>시작일·종료일을 모두 입력해야 적용되며 양 끝 날짜를 포함합니다. 기간 밖은 기본설정을 따르고, 기간이 겹치면 위쪽 설정을 사용합니다. 등록 항목의 원래 방송 조건·유효기간은 유지합니다.</p>
        <p>빈 소재 칸은 다음 순위를 따릅니다. 특수요청은 기존처럼 빈 칸까지 적용합니다.</p>
        <div className="activity-legend"><ActivityBadge kind="new" /><ActivityBadge kind="moved" /><ActivityBadge kind="edited" /></div><p>색상은 현재 화면에서 작업한 항목을 표시하며, 저장 여부를 뜻하지 않습니다.</p>
        {isLegacy && groups.length>0 && <p>기존 설정을 불러왔습니다. 기간을 확인한 뒤 수정하거나 <button type="button" onClick={()=>setGroups(current=>[...current])}>기간 방식 적용</button></p>}
      </div></details><button type="button" onClick={()=>addPeriod()}>+ 기간 추가</button>
    </div></div>
    {!groups.length && <div className="empty-state"><strong>등록된 기간이 없습니다.</strong><p>기간 추가로 시작해주세요.</p></div>}
    {groups.map((group,index)=>{
      const open=collapsed[group.id]===false;
      const invalid=!group.startDate || !group.endDate || group.startDate>group.endDate;
      const bodyId=`period-body-${group.id}`;
      return <section className={`exception-period-panel compact-period-panel ${marks[group.id] ? `activity-row-${marks[group.id]}` : ""}`} key={group.id} ref={register(group.id)}>
        <div className="period-summary-bar"><button type="button" className="period-title-toggle" aria-expanded={open} aria-controls={bodyId} onClick={()=>setCollapsed(current=>({...current,[group.id]:open}))}>
          <span className="period-chevron" aria-hidden="true">{open ? "▾" : "▸"}</span><span className="compact-period-number">{String(index+1).padStart(2,"0")}</span><strong>{group.name || "이름 없는 기간"}</strong>
          <span className="period-summary-dates">{group.startDate || "시작일 미설정"} ~ {group.endDate || "종료일 미설정"}</span><span className="period-stage-count">{group.stages.length}단계</span>
        </button><ActivityBadge kind={marks[group.id]} />{invalid && <span className="period-incomplete">날짜 확인</span>}
        <div className="compact-row-actions"><button type="button" aria-label={`${index+1}번 기간 위로`} disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button type="button" aria-label={`${index+1}번 기간 아래로`} disabled={index===groups.length-1} onClick={()=>move(index,1)}>↓</button><button type="button" onClick={()=>addPeriod(group)}>복제</button><button type="button" className="compact-delete" onClick={()=>{if(window.confirm("이 기간 설정을 삭제할까요?"))setGroups(current=>current.filter(item=>item.id!==group.id));}}>삭제</button></div>
        </div>
        <div id={bodyId} hidden={!open} className="period-expanded-body">
          <div className="period-edit-line"><label className="period-name-field">기간 이름<input aria-label={`${index+1}번 기간 이름`} value={group.name || ""} placeholder="예: 11월 오픈런" onChange={event=>change(group.id,{name:event.target.value})} /></label>
          <label>시작일<FlexibleDateInput label={`${index+1}번 기간 시작일`} value={group.startDate || ""} onChange={value=>change(group.id,{startDate:value})} /></label><label>종료일<FlexibleDateInput label={`${index+1}번 기간 종료일`} value={group.endDate || ""} onChange={value=>change(group.id,{endDate:value})} /></label></div>
          <CompactPriorityList rows={group.stages} setRows={update=>setGroups(current=>current.map(item=>item.id===group.id ? {...item,stages:stripDates(typeof update==="function" ? update(item.stages) : update)} : item))} promotions={promotions} plannedPgms={plannedPgms} />
        </div>
      </section>;
    })}
  </section>;
}
