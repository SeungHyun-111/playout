import { useState } from "react";
import SimpleSettingsTable from "./SimpleSettingsTable.jsx";
import { normalizeDateInput } from "../lib/flexibleDate.js";
import { parseSpreadsheet } from "../lib/spreadsheetPaste.js";
import { dateKey } from "../lib/scheduleFlow.js";

const fields=["eventCard","startDate","endDate","materialId"];
export default function EventCardMonth({ rows, setRows, materials }) {
  const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(new Date());
  const [month,setMonth]=useState(today.slice(0,7));
  const [notice,setNotice]=useState("");
  const [initializedMonths,setInitializedMonths]=useState([]);
  const [year,number]=month.split("-").map(Number);
  const last=new Date(Date.UTC(year,number,0)).getUTCDate();
  const first=`${month}-01`, end=`${month}-${last}`;
  const visible=rows.filter(row=>{
    if(String(row.id).startsWith("event-day-") && !row.eventCard && !row.materialId)return false;
    const start=dateKey(row.startDate), finish=dateKey(row.endDate)||start;
    return start ? start<=end && finish>=first : row.scheduleMonth===month;
  });
  // An empty month starts with a single blank input row.
  const displayed=visible.length || initializedMonths.includes(month) ? visible : [
    {id:`event-empty-${month}`,scheduleMonth:month,eventCard:"",startDate:"",endDate:"",materialId:""},
  ];
  const save=(updates)=>setRows(current=>{
    const next=[...current];
    if(!visible.length) displayed.forEach(row=>{if(!next.some(item=>item.id===row.id))next.push(row);});
    updates.forEach(({id,changes,base})=>{
      const index=next.findIndex(row=>row.id===id);
      const value={...(index<0?base:next[index]),...changes};
      if(index<0)next.push(value);else next[index]=value;
    });return next;
  });
  const edit=(index,key,value)=>{
    const changes={[key]:value};
    if(key==="eventCard" || key==="materialId") {
      const material=materials.find(row=>row.materialId===value);
      changes.eventCard=material?.materialName || "";
      changes.materialId=material?.materialId || "";
    }
    save([{id:displayed[index].id,base:displayed[index],changes}]);
  };
  const materialize=current=>{
    const next=[...current];
    if(!visible.length)displayed.forEach(row=>{if(!next.some(item=>item.id===row.id))next.push(row);});
    return next;
  };
  const addRow=afterIndex=>{
    setInitializedMonths(current=>[...new Set([...current,month])]);
    setRows(current=>{
      const next=materialize(current);
      const anchor=displayed[afterIndex ?? displayed.length-1];
      const added={id:crypto.randomUUID(),scheduleMonth:month,eventCard:"",startDate:"",endDate:"",materialId:""};
      const index=anchor?next.findIndex(row=>row.id===anchor.id):-1;
      next.splice(index<0?next.length:index+1,0,added);return next;
    });
  };
  const paste=(event,startRow,startCol)=>{
    const text=event.clipboardData.getData("text/plain");
    if(!text.includes("\t")&&!text.trim().includes("\n"))return;
    event.preventDefault();let incoming=parseSpreadsheet(text);
    if(incoming[0]?.[0]?.trim()==="행사카드")incoming=incoming.slice(1);
    const updates=[];
    for(let r=0;r<incoming.length;r++) {
      const base=displayed[startRow+r] || {id:crypto.randomUUID(),scheduleMonth:month,eventCard:"",startDate:"",endDate:"",materialId:""};
      const changes={};
      for(let c=0;c<incoming[r].length;c++) {
        const key=fields[startCol+c];if(!key)continue;
        const raw=incoming[r][c];const value=key==="startDate"||key==="endDate"?normalizeDateInput(raw,year):raw;
        if(value===null){setNotice(`${startRow+r+1}행 날짜를 확인해주세요. 붙여넣지 않았습니다.`);return;}
        changes[key]=value;
      }
      updates.push({id:base.id,base,changes});
    }
    save(updates);setNotice(`${incoming.length}행을 ${year}년 기준으로 붙여넣었습니다.`);
  };
  const move=delta=>{const date=new Date(Date.UTC(year,number-1+delta,1));setMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`);setNotice("");};
  const columns=[{key:"eventCard",label:"행사카드(소재명)",type:"select",options:materials.filter(row=>row.materialId && row.materialName).map(row=>({value:row.materialId,label:`${row.materialName} (${row.materialId})`,closedLabel:row.materialName})),displayValue:row=>row.eventCard},{key:"startDate",label:"시작일",type:"date",year,shortDate:true},{key:"endDate",label:"종료일",type:"date",year,shortDate:true},
    {key:"materialId",label:"배너소재시트 참고",type:"select",options:materials.filter(row=>row.materialId).map(row=>({value:row.materialId,label:`${row.materialId} · ${row.materialName || ""}`,closedLabel:row.materialId}))}];
  return <section className="event-card-month" data-coach="operation-settings-panel">
    <div className="event-month-toolbar">
      <button type="button" aria-label="이전 달" onClick={()=>move(-1)}>‹</button>
      <label>연도 <select aria-label="행사카드 연도" value={year} onChange={e=>{setMonth(`${e.target.value}-${String(number).padStart(2,"0")}`);setNotice("");}}>{Array.from(new Set([...Array.from({length:21},(_,i)=>Number(today.slice(0,4))-10+i),year,...rows.flatMap(row=>dateKey(row.startDate)?[Number(dateKey(row.startDate).slice(0,4))]:[])])).sort((a,b)=>a-b).map(y=><option key={y}>{y}</option>)}</select></label>
      <label>월 <select aria-label="행사카드 월" value={number} onChange={e=>{setMonth(`${year}-${String(e.target.value).padStart(2,"0")}`);setNotice("");}}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}월</option>)}</select></label>
      <button type="button" aria-label="다음 달" onClick={()=>move(1)}>›</button>
      <strong>{year}년 {number}월 행사카드 일정</strong>
    </div>
    <p className="event-month-help">날짜는 선택한 연도를 기준으로 입력됩니다. 엑셀의 행사카드·시작일·종료일·배너소재 4열을 그대로 붙여넣을 수 있습니다. 빈 달에는 빈 행 하나로 시작합니다.</p>
    {notice&&<p role="status">{notice}</p>}
    <SimpleSettingsTable key={month} columns={columns.map(col=>col.key==="eventCard"?{...col,valueKey:"materialId"}:col)} rows={displayed} onChange={edit} onPaste={paste}
      onAddRow={()=>addRow()} onInsertRow={addRow} addRowLabel="일정 추가"
      onDeleteRow={index=>{const row=displayed[index];setInitializedMonths(current=>[...new Set([...current,month])]);setRows(current=>materialize(current).filter(item=>item.id!==row.id));}} />
  </section>;
}
