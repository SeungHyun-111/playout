import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConflictMaterialTable from "../components/ConflictMaterialTable.jsx";
import { analyzeMaterials, buildConflictDisplayGroups, normalizeMaterials, groupMaterialPeriods, validDate, dayNumber, dateFromDay } from "../lib/materialConflicts.js";
import "../styles/material-conflicts.css";

const short = date => date.slice(5).replace("-", "/");
const label = type => type === "duplicate" ? "동일 소재 중복" : "소재 충돌";
function FloatingTooltip({x,y,above=false,className="",id,children,onMouseEnter,onMouseLeave}) {
  const ref=useRef(null);
  const [position,setPosition]=useState(null);
  useLayoutEffect(()=>{
    const update=()=>{
      const bounds=ref.current?.getBoundingClientRect();
      if(!bounds)return;
      const margin=12;
      setPosition({left:Math.max(margin,Math.min(x,window.innerWidth-bounds.width-margin)),top:Math.max(margin,Math.min(above?y-bounds.height:y,window.innerHeight-bounds.height-margin))});
    };
    update();
    const observer=new ResizeObserver(update);observer.observe(ref.current);
    window.addEventListener("resize",update);
    return()=>{observer.disconnect();window.removeEventListener("resize",update);};
  },[x,y,above]);
  return createPortal(<div ref={ref} id={id} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} role="tooltip" className={`mc-hover-tooltip ${className}`} style={{left:position?.left??0,top:position?.top??0,visibility:position?"visible":"hidden"}}>{children}</div>,document.body);
}
function Symbol({kind="layers"}) {
  const paths={layers:"m12 3 10 5-10 5L2 8l10-5z M2 12l10 5 10-5 M2 16l10 5 10-5",conflict:"M12 3 2 21h20L12 3z M12 9v5 M12 17h.01",duplicate:"m10 14 4-4 M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0 M12 18a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1",calendar:"M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16"};
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind] || paths.layers}/></svg>;
}
export default function MaterialConflicts({settings,error,onNavigate}) {
  const [period,setPeriod]=useState(()=>{const now=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Seoul"}); const month=now.slice(0,7); const last=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();return {start:`${month}-01`,end:`${month}-${last}`};});
  const [socket,setSocket]=useState(0), [selected,setSelected]=useState(null);
  const [selectedCell,setSelectedCell]=useState(null);
  const [hoverCell,setHoverCell]=useState(null);
  const [statusTooltip,setStatusTooltip]=useState(null);
  const tooltipCloseTimer=useRef(null);
  const keepTooltip=()=>clearTimeout(tooltipCloseTimer.current);
  const closeTooltip=()=>{keepTooltip();tooltipCloseTimer.current=setTimeout(()=>{setHoverCell(null);setStatusTooltip(null);},240);};
  useEffect(()=>()=>clearTimeout(tooltipCloseTimer.current),[]);
  const [outputChoices,setOutputChoices]=useState(()=>{
    try {const saved=JSON.parse(sessionStorage.getItem("playout.materialConflicts.outputChoices")||"{}");return saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{};}catch{return {};}
  });
  useEffect(()=>{try{sessionStorage.setItem("playout.materialConflicts.outputChoices",JSON.stringify(outputChoices));}catch{/* Session storage may be disabled. */}},[outputChoices]);
  const rows=useMemo(()=>normalizeMaterials(settings),[settings]);
  const analysis=useMemo(()=>{
    const result=analyzeMaterials(rows,period.start,period.end,socket);
    const issues=result.issues.filter(issue=>issue.type==="conflict");
    const ids=new Set(issues.flatMap(issue=>[issue.a.id,issue.b.id]));
    return {...result,issues,rows:result.rows.filter(row=>ids.has(row.id))};
  },[rows,period,socket]);
  const periodGroups=useMemo(()=>groupMaterialPeriods(analysis.rows,period.start,period.end).map(group=>({...group,rows:group.rows.filter(row=>analysis.issues.some(issue=>(issue.a.id===row.id||issue.b.id===row.id)&&issue.start<=group.end&&issue.end>=group.start))})),[analysis,period]);
  const invalidPeriod=!validDate(period.start)||!validDate(period.end)||period.start>period.end;
  const days=invalidPeriod ? 0 : dayNumber(period.end)-dayNumber(period.start)+1;
  const conflictGroups=useMemo(()=>buildConflictDisplayGroups(analysis.issues,rows),[analysis.issues,rows]);
  const issues=conflictGroups.filter(group=>!selectedCell||group.id===selectedCell.issueId);
  const invalidRows=rows.filter(row=>row.invalid);

  return <div className="mc-page">
    {hoverCell&&<FloatingTooltip onMouseEnter={keepTooltip} onMouseLeave={closeTooltip} x={hoverCell.x} y={hoverCell.y}><strong>{short(hoverCell.start)} ~ {short(hoverCell.end)} · 배너{hoverCell.slot}</strong><span>소재 충돌 {hoverCell.count}건 · 클릭하여 상세 확인</span>{hoverCell.active.slice(0,5).map(row=><div key={row.id}>{row.name}<code>{row.materials[hoverCell.slot-1]}</code></div>)}</FloatingTooltip>}
    {statusTooltip&&<FloatingTooltip onMouseEnter={keepTooltip} onMouseLeave={closeTooltip} id="mc-status-tooltip" className="mc-status-tooltip" x={statusTooltip.x} y={statusTooltip.y} above={statusTooltip.above}><strong>{statusTooltip.name} · 충돌 조합 {statusTooltip.details.length}건</strong><p>같은 기간·소켓에서 같은 소재코드를 &로 묶은 뒤, 서로 다른 소재의 충돌 조합을 셉니다. 이 행이 포함된 조합만 표시하며 행별 건수를 합하면 중복 집계됩니다.</p><div className="mc-status-items">{statusTooltip.details.map(pair=><section key={pair.id}><small>배너{pair.slot} · {short(pair.start)} ~ {short(pair.end)}</small><div>{pair.items.map(item=><span key={item.code}>{item.name}<code>{item.code}</code></span>).reduce((all,item,index)=>index?[...all,<b key={`vs-${index}`}>⚔️</b>,item]:[item],[])}</div></section>)}</div></FloatingTooltip>}
    <header className="mc-header"><span className="mc-logo"><Symbol/></span><h1>배너 소재 충돌 예측</h1><span className="mc-subtitle">프로모션 + 기획PGM 통합 검증</span></header>
    <section className="mc-toolbar mc-panel" aria-label="분석 조건">
      <strong>분석 기간</strong><div className="mc-dates"><input aria-label="분석 시작일" type="date" value={period.start} onChange={e=>{setPeriod({...period,start:e.target.value});setSelected(null);setSelectedCell(null);}}/><span>~</span><input aria-label="분석 종료일" type="date" value={period.end} onChange={e=>{setPeriod({...period,end:e.target.value});setSelected(null);setSelectedCell(null);}}/></div>
      <strong>배너(소켓)</strong><div className="mc-sockets">{[0,1,2,3,4,5].map(slot=><button key={slot} aria-pressed={socket===slot} className={socket===slot?"selected":""} onClick={()=>{setSocket(slot);setSelected(null);setSelectedCell(null);}}>{slot?`배너${slot}`:"전체"}</button>)}</div>
    </section>
    {error && <div className="mc-notice" role="alert">{error}</div>}
    {invalidPeriod && <div className="mc-notice" role="alert">시작일과 종료일을 올바르게 입력해주세요. 종료일은 시작일 이후여야 합니다.</div>}
    {!!invalidRows.length && <div className="mc-notice">기간 설정 확인 필요 {invalidRows.length}건 · {invalidRows.map(row=>row.name).join(", ")} — 날짜 누락 또는 역전으로 분석에서 제외했습니다.</div>}
    <div className="mc-workspace"><div className="mc-main">
      <section className="mc-panel mc-timeline-panel"><div className="mc-panel-heading"><h2>배너별 통합 타임라인</h2><div className="mc-legend"><span><i className="conflict"/>소재 충돌</span></div></div>
        <p className="mc-caption">충돌 바를 누르면 해당 바에 배정된 충돌 조합을 아래에서 확인할 수 있습니다.</p>
        <div className="mc-timeline-scroll mc-glass-timeline" style={{"--mc-days":days||1}}>
          <div className="mc-glass-axis"><div className="mc-axis-label">배너 소켓</div><div className="mc-axis-dates"><div className="mc-axis-month">{period.start.slice(0,4)}년 {Number(period.start.slice(5,7))}월</div><div className="mc-day-headings">{Array.from({length:days},(_,i)=>{const date=dateFromDay(dayNumber(period.start)+i);return <div key={date}><strong>{date.slice(8)}</strong><small>{["일","월","화","수","목","금","토"][new Date(`${date}T00:00:00Z`).getUTCDay()]}</small></div>;})}</div></div></div>
          {[1,2,3,4,5].filter(slot=>!socket||socket===slot).map(slot=>{
            const runs=conflictGroups.filter(group=>group.slot===slot).map(group=>({...group,offset:dayNumber(group.start)-dayNumber(period.start),length:dayNumber(group.end)-dayNumber(group.start)+1,tone:"conflict",issueId:group.id}));
            return <div className="mc-glass-row" key={slot}><div className="mc-glass-slot"><span>배너{slot}</span><small>{["카드 배너","우상단 CI","L바","특이 배너","플로팅 배너"][slot-1]}</small></div><div className="mc-run-track" style={{minHeight:Math.max(61,runs.length*42+16),backgroundSize:`${100/days}% 100%`}}>{runs.filter(run=>run.tone!=="empty").map((run,lane)=>{
              const matches=run.materialPairs;
              const active=run.rows;
              const chosen=selectedCell?.slot===slot&&selectedCell.start===run.start&&selectedCell.end===run.end&&selectedCell.issueId===run.issueId;
              return <button key={run.issueId||run.start} className={`mc-range-bar ${run.tone} ${chosen?"selected":""}`} style={{top:12+lane*42,left:`${run.offset/days*100}%`,"--mc-run-width":`${run.length/days*100}%`}} aria-pressed={chosen} aria-label={`배너${slot} ${run.start} ~ ${run.end} ${matches.length?"중복/충돌":"정상"} ${active.length}개 항목`} onMouseEnter={event=>{keepTooltip();const rect=event.currentTarget.getBoundingClientRect();setHoverCell({...run,slot,count:matches.length,active,x:Math.min(rect.left,window.innerWidth-300),y:Math.min(rect.bottom+10,window.innerHeight-210)});}} onMouseLeave={closeTooltip} onClick={()=>{setHoverCell(null);setSelectedCell(chosen?null:{slot,start:run.start,end:run.end,issueId:run.issueId,rowIds:active.map(row=>row.id)});setSelected(null);}}><span className="mc-bar-summary"><span className="mc-bar-period">{short(run.start)}~{short(run.end)} · </span><span>충돌 {run.materialPairs.length}건</span></span></button>;
            })}</div></div>;

          })}
        </div>
      </section>
    </div><aside className="mc-panel mc-details"><div className="mc-panel-heading"><h2>소재 충돌 상세</h2></div>
      {selectedCell&&<button className="mc-cell-selection" onClick={()=>{setSelectedCell(null);setSelected(null);}}>{short(selectedCell.start)} ~ {short(selectedCell.end)} · 배너{selectedCell.slot} 선택 해제 ×</button>}
      <div className="mc-issue-list">{issues.map(group=><article key={group.id} className={`mc-issue ${selectedCell?.issueId===group.id?"selected":""}`}>
        <button className="mc-group-select" onClick={()=>{setSelectedCell(selectedCell?.issueId===group.id?null:{slot:group.slot,start:group.start,end:group.end,issueId:group.id,rowIds:group.rows.map(row=>row.id)});setSelected(null);}}><span className="mc-badge conflict">소재 충돌</span><b>배너{group.slot}</b><span>{short(group.start)} ~ {short(group.end)}</span><b>{group.rows.length}개 항목</b></button>
        <div className="mc-pair-cases"><strong>소재 충돌 조합 {group.materialPairs.length}건</strong>{group.materialPairs.map(pair=>{
          const saved=pair.sourceIssueIds.map(id=>outputChoices[id]).filter(Boolean).map(id=>pair.items.find(item=>item.rowIds.includes(id))?.code).filter(Boolean);
          const legacyChoice=saved.length&&new Set(saved).size===1?saved[0]:"";
          const choice=Object.hasOwn(outputChoices,pair.id)?outputChoices[pair.id]:legacyChoice;
          const custom=choice&&typeof choice==="object"&&choice.type==="custom";
          const chosen=custom||pair.items.some(item=>item.code===choice);
          return <div className={`mc-pair-decision ${chosen?"is-chosen":""}`} key={pair.id}><div className="mc-pair-inline"><span className="mc-pair-material">{pair.items[0].name}<code>{pair.items[0].code}</code></span><span className="mc-pair-versus">⚔️</span><span className="mc-pair-material">{pair.items[1].name}<code>{pair.items[1].code}</code></span></div><div className="mc-decision-inputs"><select aria-label={`${pair.items[0].name}, ${pair.items[1].name} 내보낼 소재`} value={custom?"__custom__":chosen?choice:""} onChange={event=>setOutputChoices(previous=>({...previous,[pair.id]:event.target.value==="__custom__"?{type:"custom",value:""}:event.target.value||null}))}><option value="">미선택</option>{pair.items.map(item=><option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}<option value="__custom__">기타</option></select>{custom&&<input className="mc-custom-material" type="text" aria-label={`${pair.items[0].name}, ${pair.items[1].name} 기타 소재 직접 입력`} placeholder="소재코드 직접 입력" value={choice.value||""} onChange={event=>setOutputChoices(previous=>({...previous,[pair.id]:{type:"custom",value:event.target.value}}))}/>}</div></div>;
        })}</div>
      </article>)}{!issues.length&&<div className="mc-empty">선택한 조건에서 소재 충돌이 발견되지 않았습니다.</div>}</div>
      <p className="mc-detail-note">같은 소켓·소재 조합은 실제 충돌 기간에 한 번만 표시합니다. 건수는 소켓별 고유 소재 조합 기준입니다.</p>
    </aside></div>
    <ConflictMaterialTable rows={rows} periodGroups={periodGroups} period={period} socket={socket} settings={settings} onNavigate={onNavigate}/>
    <p className="mc-footnote">통합 목록은 시작·종료일 경계로 구간을 나눠 같은 기간에 적용되는 항목을 묶습니다. · 운영 설정 실시간 연동 · 시작일과 종료일 포함 · 우선순위 미적용 · 배너5는 비고에 소재코드(0F…)만 입력된 항목을 분석합니다.</p>
  </div>;
}
