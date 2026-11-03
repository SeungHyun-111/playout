import { useRef, useState } from "react";
import { channelValue, outputRows, exportValues, EXPORT_HEADERS, createBulkXls } from "../lib/bulkExport.js";

const escape = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
export default function BulkExportDialog({ rows }) {
  const dialogRef=useRef(null);
  const [selected,setSelected]=useState(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const candidates=outputRows(rows);
  const channels=[...new Set(candidates.map(channelValue))].sort((a,b)=>a.localeCompare(b,"ko",{numeric:true}));
  const active=selected===null?channels:channels.filter(channel=>selected.includes(channel));
  const targets=outputRows(candidates,active);
  const download=async()=>{
    if(!targets.length || busy)return;
    setBusy(true);setStatus("");
    try {
      const response=await fetch(`${import.meta.env.BASE_URL}templates/BroadTimeSample.xls`);
      if(!response.ok)throw new Error("내려받기 양식을 불러오지 못했습니다.");
      const bytes=await createBulkXls(await response.arrayBuffer(),targets);
      const dates=[...new Set(targets.map(row=>String(row[1]||"").replaceAll("/","-")).filter(Boolean))].sort();
      const label=dates.length>1?`${dates[0]}~${dates.at(-1)}`:dates[0]||"undated";
      const url=URL.createObjectURL(new Blob([bytes],{type:"application/vnd.ms-excel"}));
      const link=document.createElement("a");link.href=url;link.download=`BroadTime_${label.replace(/[\\/:*?"<>|]/g,"-")}.xls`;document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      setStatus(`${targets.length}건을 내려받았습니다. 모든 값은 텍스트 형식입니다.`);
    } catch(error) {setStatus(error.message || "내려받기에 실패했습니다.");}
    finally {setBusy(false);}
  };
  const print=()=>{
    const popup=window.open("","_blank","width=1100,height=800");
    if(!popup){setStatus("인쇄 창을 열 수 없습니다. 브라우저의 팝업 설정을 확인해주세요.");return;}
    const table=`<table><thead><tr>${EXPORT_HEADERS.map(h=>`<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${exportValues(targets).map(row=>`<tr>${row.map(v=>`<td>${escape(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    popup.opener=null;
    popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>내부 일괄등록</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,'Malgun Gothic',sans-serif;color:#000;background:#fff;font-size:10pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:6px 8px;white-space:nowrap;text-align:center}th{background:#9cf;print-color-adjust:exact;-webkit-print-color-adjust:exact}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body>${table}</body></html>`);
    popup.document.close();
    popup.focus();setTimeout(()=>popup.print(),200);
  };
  return <>
    <button type="button" disabled={!candidates.length} onClick={()=>{setSelected(null);setStatus("");dialogRef.current.showModal();}}>내려받기·인쇄</button>
    <dialog className="bulk-export-dialog" ref={dialogRef} aria-labelledby="bulk-export-title">
      <h2 id="bulk-export-title">내려받기·인쇄 대상 선택</h2>
      <p>현재 선택한 날짜에 있는 채널 값만 표시합니다. 체크한 채널의 항목을 출력합니다.</p>
      <div className="bulk-export-channel-actions"><strong>채널</strong><button type="button" disabled={busy} onClick={()=>setSelected(null)}>전체 선택</button><button type="button" disabled={busy} onClick={()=>setSelected([])}>선택 해제</button></div>
      <div className="bulk-export-channels">{channels.map(channel=><label key={channel}><input type="checkbox" checked={active.includes(channel)} disabled={busy} onChange={event=>setSelected(event.target.checked?[...active,channel]:active.filter(value=>value!==channel))} />{channel || "채널 없음"}<span>{candidates.filter(row=>channelValue(row)===channel).length}건</span></label>)}</div>
      <p className="bulk-export-summary">출력 대상 {targets.length}건 · 날짜·시간·소재를 모두 텍스트로 저장합니다.</p>
      <div className="actions"><button type="button" disabled={busy} onClick={()=>dialogRef.current.close()}>닫기</button><button type="button" disabled={busy || !targets.length} onClick={print}>인쇄</button><button type="button" disabled={busy || !targets.length} onClick={download}>{busy?"파일 생성 중…":"XLS 내려받기"}</button></div>
      {status && <p role="status">{status}</p>}
    </dialog>
  </>;
}
