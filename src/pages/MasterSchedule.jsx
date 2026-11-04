import { useRef, useState } from "react";
import { saveMasterSchedule } from "../lib/saveMasterSchedule.js";
import DateSelection from "../components/DateSelection.jsx";
import useDateSelection from "../hooks/useDateSelection.js";
import { MASTER_HEADERS } from "../lib/scheduleFlow.js";
import ScheduleViewControls from "../components/ScheduleViewControls.jsx";
import { MASTER_MATERIAL_COLUMNS, materialDisplay, matchesSchedule } from "../lib/scheduleView.js";

export default function MasterSchedule({ rows: allRows, entries, sourceSnapshot, error, materialNames={},setComment,commentsLoaded,commentsError }) {
  const [status, setStatus] = useState("");
  const [showNames,setShowNames]=useState(false),[query,setQuery]=useState(""),[allDates,setAllDates]=useState(true);
  const [saving,setSaving] = useState(false);
  const savePending = useRef(false);
  const headers = MASTER_HEADERS;
  const selection = useDateSelection(allRows.map(row=>row[1]), "master");
  const selectedRows = allRows.filter(row=>selection.includes(row[1]));
  const visibleEntries=entries.filter(entry=>(query.trim() && allDates || selection.includes(entry.values[1])) && matchesSchedule(entry.values,query,materialNames,MASTER_MATERIAL_COLUMNS));
  const rows = visibleEntries.map((entry,index)=>entry.values.map((value,col)=>col===0?String(index+1):value));
  const save = async () => {
    if (savePending.current) return;
    savePending.current = true;
    setSaving(true);
    setStatus("선택한 방송일자의 운행표를 DB에 저장 중입니다. 완료될 때까지 화면을 유지해주세요.");
    try {
      const result = await saveMasterSchedule(entries.filter(entry=>selection.includes(entry.values[1])),sourceSnapshot);
      setStatus(`${result.dates.join(", ")} · ${result.eventCount}건 저장 완료. 날짜별 새 버전과 소재·방송 검색 인덱스를 함께 저장했습니다.`);
    } catch (failure) {
      setStatus(`저장 실패: ${failure.code === "PERMISSION_DENIED" || failure.code === "permission-denied" ? "DB 저장 권한을 확인해주세요." : failure.message || "연결과 DB 권한을 확인해주세요."}`);
    } finally {
      savePending.current = false;
      setSaving(false);
    }
  };
  const copy = async () => {
    try {
      const quote=value=>/[\t\r\n"]/.test(String(value)) ? `"${String(value).replaceAll('"','""')}"` : String(value);
      await navigator.clipboard.writeText([headers, ...rows].map(row => row.map(quote).join("\t")).join("\r\n"));
      setStatus("주조 운행표를 복사했습니다.");
    } catch {
      setStatus("복사하지 못했습니다. 브라우저 클립보드 권한을 확인해주세요.");
    }
  };
  return <div className="output-page">
    <header className="topbar">
      <div><h1>주조 운행표</h1><p>내부 일괄등록과 광고 설정을 반영한 운행표입니다. {rows.length}건</p></div>
      <div className="actions"><button data-coach="master-save" type="button" disabled={!selectedRows.length || saving || Boolean(error) || !commentsLoaded} onClick={save}>{saving ? "저장 중…" : "주조 운행표 저장"}</button><button type="button" disabled={!rows.length} onClick={copy}>운행표 복사</button></div>
    </header>
    <DateSelection {...selection} />
    <ScheduleViewControls {...{query,setQuery,allDates,setAllDates,showNames,setShowNames}} count={rows.length} total={allRows.length} />
    <p className="master-schedule-status">DB 저장 대상: 선택한 날짜의 전체 {selectedRows.length}건(검색 조건과 무관). 이전 버전은 유지되며 송출 예정 정보로 기록됩니다.</p>
    {status && <p role="status" className="master-schedule-status">{status}</p>}
    {error && <p role="alert" className="master-schedule-status">{error}</p>}
    {commentsError && <p role="alert" className="master-schedule-status">{commentsError}</p>}
    <section className="master-schedule-scroll" aria-label="주조 운행표">
      {!rows.length && <div className="empty-state"><strong>{query ? "검색 결과가 없습니다." : "등록된 운행표가 없습니다."}</strong><p>{query ? "검색어나 날짜 조건을 변경해주세요." : "TimeBlock 또는 내부 일괄등록에 일정을 입력해주세요."}</p></div>}
      {rows.length > 0 &&
      <table className="master-schedule-table">
        <thead><tr>{headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={visibleEntries[rowIndex].commentKey}>{headers.map((_, colIndex) => <td key={colIndex} className={colIndex===24 ? "master-comment-cell" : showNames && MASTER_MATERIAL_COLUMNS.includes(colIndex) ? "material-name-cell" : undefined} title={String(row[colIndex] ?? "")}>{colIndex===24 ? <textarea data-coach="master-comment" aria-label={`${row[1]} ${row[2]} 편성팀 코멘트`} rows={1} wrap="off" disabled={!commentsLoaded} placeholder={commentsLoaded ? "직접 입력 · 자동 저장" : "불러오는 중…"} value={row[24] || ""} onChange={event=>setComment(visibleEntries[rowIndex].commentKey,event.target.value)} /> : showNames && MASTER_MATERIAL_COLUMNS.includes(colIndex) ? materialDisplay(row[colIndex],materialNames) : row[colIndex] || ""}</td>)}</tr>)}</tbody>
      </table>}
    </section>
  </div>;
}
