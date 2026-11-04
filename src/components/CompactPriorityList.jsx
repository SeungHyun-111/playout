import useNewItemMarker from "../hooks/useNewItemMarker.js";
import { BASE_STAGE_LABELS } from "../lib/priorityStages.js";

export const ACTIVITY_LABELS={new:"신규",moved:"순서 변경",edited:"내용 수정"};
export function ActivityBadge({kind}) {
  return kind ? <span className={`activity-badge activity-${kind}`}>{ACTIVITY_LABELS[kind]}</span> : null;
}

export default function CompactPriorityList({rows,setRows,promotions,plannedPgms}) {
  const {marks,markNew,markChange,register}=useNewItemMarker(rows);
  const add=()=>{
    const id=crypto.randomUUID();markNew(id);setRows(current=>[{id,targetType:"promotion",targetId:""},...current]);
  };
  const update=(id,fields)=>{
    markChange(id,"edited");setRows(current=>current.map(row=>row.id===id ? {...row,...fields} : row));
  };
  const move=(index,to)=>{
    if(index===to || to<0 || to>=rows.length)return;
    markChange(rows[index].id,"moved");
    setRows(current=>{const next=[...current],[row]=next.splice(index,1);next.splice(to,0,row);return next;});
  };
  return <div className="compact-priority-list">
    <div className="compact-list-toolbar"><strong>적용 순서 <small>{rows.length}개 · 위쪽 우선</small></strong><button type="button" onClick={add}>+ 항목 추가</button></div>
    <div className="compact-priority-scroll"><div className="compact-priority-head"><span>순위</span><span>구분</span><span>적용 항목</span><span>최근 작업</span><span>순서 / 관리</span></div>
    {rows.map((row,index)=>{
      const base=row.targetType==="base";
      const options=(row.targetType==="promotion" ? promotions : plannedPgms).filter(item=>item.id && String((row.targetType==="promotion" ? item.promotionName : item.plannedPgmName) ?? "").trim());
      const selected=options.find(item=>item.id===row.targetId);
      return <div className={`compact-priority-row ${marks[row.id] ? `activity-row-${marks[row.id]}` : ""}`} key={row.id} ref={register(row.id)}>
        <span className="compact-rank">{String(index).padStart(2,"0")}</span>
        <div>{base ? <span className="compact-type">기본 규칙</span> : <select aria-label={`${index}단계 구분`} value={row.targetType} onChange={event=>update(row.id,{targetType:event.target.value,targetId:""})}><option value="promotion">프로모션</option><option value="plannedPgm">기획PGM</option></select>}</div>
        <div className="compact-item-name">{base ? <strong>{BASE_STAGE_LABELS[row.priorityKey]}</strong> : <select aria-label={`${index}단계 등록 항목`} value={row.targetId} className={!selected ? "needs-selection" : ""} onChange={event=>update(row.id,{targetId:event.target.value})}><option value="">등록 항목 선택</option>{row.targetId && !selected && <option value={row.targetId}>등록 항목 없음 · 다시 선택</option>}{options.map(item=><option key={item.id} value={item.id}>{row.targetType==="promotion" ? item.promotionName : item.plannedPgmName}{item.startDate || item.endDate ? ` (${item.startDate || "제한 없음"} ~ ${item.endDate || "제한 없음"})` : ""}</option>)}</select>}</div>
        <div><ActivityBadge kind={marks[row.id]} /></div>
        <div className="compact-row-actions"><select aria-label={`${index}단계 위치`} value={index} onChange={event=>move(index,Number(event.target.value))}>{rows.map((_,i)=><option key={i} value={i}>{i}순위</option>)}</select><button type="button" aria-label={`${index}단계 위로`} disabled={index===0} onClick={()=>move(index,index-1)}>↑</button><button type="button" aria-label={`${index}단계 아래로`} disabled={index===rows.length-1} onClick={()=>move(index,index+1)}>↓</button>{!base ? <button type="button" className="compact-delete" onClick={()=>{if(window.confirm("이 항목을 삭제할까요?"))setRows(current=>current.filter(item=>item.id!==row.id));}}>삭제</button> : <span className="compact-locked">기본</span>}</div>
      </div>;
    })}</div>
  </div>;
}
