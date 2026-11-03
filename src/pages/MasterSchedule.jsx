import { useState } from "react";
import DateSelection from "../components/DateSelection.jsx";
import useDateSelection from "../hooks/useDateSelection.js";
import { MASTER_HEADERS } from "../lib/scheduleFlow.js";

export default function MasterSchedule({ rows: allRows, error }) {
  const [status, setStatus] = useState("");
  const headers = MASTER_HEADERS;
  const selection = useDateSelection(allRows.map(row=>row[1]), "master");
  const rows = allRows.filter(row=>selection.includes(row[1])).map((row,index)=>row.map((value,col)=>col===0?String(index+1):value));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText([headers, ...rows].map(row => row.join("\t")).join("\r\n"));
      setStatus("주조 운행표를 복사했습니다.");
    } catch {
      setStatus("복사하지 못했습니다. 브라우저 클립보드 권한을 확인해주세요.");
    }
  };
  return <div className="output-page">
    <header className="topbar">
      <div><h1>주조 운행표</h1><p>내부 일괄등록과 광고 설정을 반영한 운행표입니다. {rows.length}건</p></div>
      <div className="actions"><button type="button" disabled={!rows.length} onClick={copy}>운행표 복사</button></div>
    </header>
    <DateSelection {...selection} />
    {status && <p role="status" className="master-schedule-status">{status}</p>}
    {error && <p role="alert" className="master-schedule-status">{error}</p>}
    <section className="master-schedule-scroll" aria-label="주조 운행표">
      {!rows.length && <div className="empty-state"><strong>등록된 운행표가 없습니다.</strong><p>TimeBlock 또는 내부 일괄등록에 일정을 입력해주세요.</p></div>}
      {rows.length > 0 &&
      <table className="master-schedule-table">
        <thead><tr>{headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, colIndex) => <td key={colIndex}>{row[colIndex] || ""}</td>)}</tr>)}</tbody>
      </table>}
    </section>
  </div>;
}
