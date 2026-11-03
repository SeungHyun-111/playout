import { useState } from "react";
import DateSelection from "../components/DateSelection.jsx";
import BulkExportDialog from "../components/BulkExportDialog.jsx";
import useDateSelection from "../hooks/useDateSelection.js";
import { BULK_HEADERS } from "../lib/scheduleFlow.js";

const headers = BULK_HEADERS;
const emptyRow = () => headers.map(() => "");

// Spreadsheet clipboard cells may contain quoted tabs and line breaks.
export function parseSpreadsheet(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && (quoted || cell === "")) {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === "\t" || char === "\n" || char === "\r")) {
      row.push(cell); cell = "";
      if (char !== "\t") {
        rows.push(row); row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else cell += char;
  }
  row.push(cell);
  if (row.some(value => value !== "") || row.length > 1) rows.push(row);
  return rows;
}

export default function BulkRegistration({ rows, setRows, reset, error }) {
  const [status, setStatus] = useState("");
  const selection = useDateSelection(rows.map(row=>row[1]), "bulk");
  const visibleIndexes = rows.flatMap((row,index)=>selection.includes(row[1]) ? [index] : []);
  const visibleRows = visibleIndexes.map(index=>rows[index]);
  const paste = (event, rowIndex, colIndex) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    let incoming = parseSpreadsheet(text);
    if (incoming[0]?.[0]?.trim() === headers[0] && incoming[0]?.[1]?.trim() === headers[1]) incoming = incoming.slice(1);
    if (incoming.some(row => row.length + colIndex > headers.length)) {
      setStatus("25개 열 범위를 넘는 내용이 있습니다. 붙여넣을 위치와 열 개수를 확인해주세요."); return;
    }
    setRows(current => {
      const next = current.map(row => [...row]);
      const start = visibleIndexes.indexOf(rowIndex);
      incoming.forEach((row, r) => {
        const target = visibleIndexes[start+r] ?? next.length;
        if (!next[target]) next.push(emptyRow());
        row.forEach((value,c)=>{next[target][colIndex+c]=value;});
      });
      return next;
    });
    setStatus(`${incoming.length}행을 붙여넣었습니다.`);
  };
  const copy = async () => {
    const quote = value => /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
    try {
      await navigator.clipboard.writeText([headers, ...visibleRows.filter(row => row.some(Boolean))].map(row => row.map(quote).join("\t")).join("\r\n"));
      setStatus("내부 일괄등록 표를 복사했습니다.");
    } catch { setStatus("복사 권한을 확인해주세요."); }
  };
  return <div className="output-page">
    <header className="topbar"><div><h1>내부 일괄등록</h1><p>TimeBlock과 운영설정이 자동 반영됩니다. 직접 수정한 셀은 유지되며 주조 운행표에도 반영됩니다.</p></div>
      <div className="actions"><BulkExportDialog rows={visibleRows} /><button type="button" onClick={() => setRows(current => [...current, emptyRow()])}>행 추가</button><button type="button" onClick={copy}>표 복사</button><button type="button" onClick={() => { if (window.confirm("직접 수정한 내용과 추가 행을 지우고 TimeBlock·운영설정 기준으로 다시 불러올까요?")) { reset(); setStatus(""); } }}>원천 기준으로 재생성</button></div>
    </header>
    <DateSelection {...selection} />
    {status && <p role="status" className="master-schedule-status">{status}</p>}
    {error && <p role="alert" className="master-schedule-status">{error}</p>}
    {!rows.length && <p className="master-schedule-status">TimeBlock에 입력된 일정이 없습니다.</p>}
    <section className="master-schedule-scroll" aria-label="내부 일괄등록 입력 표">
      <table className="master-schedule-table bulk-registration-table"><thead><tr>{headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead>
        <tbody>{visibleIndexes.map(rowIndex => <tr key={rowIndex}>{headers.map((header, colIndex) => <td key={colIndex}><textarea aria-label={`${rowIndex + 1}행 ${colIndex + 1}열 ${header}`} rows="1" spellCheck={false} value={rows[rowIndex][colIndex] ?? ""} onPaste={event => paste(event, rowIndex, colIndex)} onChange={event => setRows(current => current.map((item, index) => index === rowIndex ? headers.map((_, c) => c === colIndex ? event.target.value : item[c] || "") : item))} /></td>)}</tr>)}</tbody>
      </table>
    </section>
  </div>;
}
