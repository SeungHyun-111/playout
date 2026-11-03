import { useState } from "react";
import useRtdbValue from "../hooks/useRtdbValue.js";
import FlexibleDateInput from "../components/FlexibleDateInput.jsx";

export default function AdvertisementSettings() {
  const [rows, setRows] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  useRtdbValue("settings/advertisements", rows, setRows);
  useRtdbValue("settings/advertisementCatalog", advertisements, setAdvertisements);
  const change = (id, key, value) => setRows(current => current.map(row => row.id === id ? { ...row, [key]: value } : row));
  return <div className="output-page">
    <header className="topbar"><div><h1>광고 설정</h1><p>공익방송 및 고지사항용 광고를 설정합니다.</p></div>
    </header>
    <section className="settings-workspace">
      <div className="advertisement-section-heading"><h2>스케줄 설정</h2><button type="button" onClick={() => setRows(current => [...current, { id: crypto.randomUUID(), startTime: "", disaster: false, material: "", materialName: "", durationSeconds: "" }])}>행 추가</button></div>
      <p style={{ marginBottom: 12 }}>시작시간(hour)을 기준으로 첫 PGM 앞에 광고 생성</p>
      <table className="settings-table advertisement-table">
        <thead><tr><th>시작시간</th><th>재난방송</th><th>소재</th><th>소재명</th><th>광고시간(초)</th><th>관리</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <td><FlexibleDateInput label="시작시간" kind="time" value={row.startTime} onChange={value => change(row.id, "startTime", value)} /></td>
          <td className="advertisement-checkbox"><input aria-label="재난방송" type="checkbox" checked={row.disaster} onChange={event => change(row.id, "disaster", event.target.checked)} /></td>
          <td><input aria-label="소재" value={row.material} onChange={event => change(row.id, "material", event.target.value)} /></td>
          <td><input aria-label="소재명" value={row.materialName} onChange={event => change(row.id, "materialName", event.target.value)} /></td>
          <td><input aria-label="광고시간(초)" type="number" min="0" step="1" value={row.durationSeconds} onChange={event => change(row.id, "durationSeconds", event.target.value)} /></td>
          <td><button type="button" onClick={() => { if (window.confirm("이 광고 설정을 삭제할까요?")) setRows(current => current.filter(item => item.id !== row.id)); }}>삭제</button></td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <div className="empty-state"><p>등록된 광고가 없습니다. 행 추가를 눌러 공익방송 또는 고지사항을 입력해주세요.</p></div>}
      <div className="advertisement-section-heading advertisement-catalog-heading"><h2>광고 목록</h2><button type="button" onClick={() => setAdvertisements(current => [...current, { id: crypto.randomUUID(), material: "", materialName: "", durationSeconds: "" }])}>광고 추가</button></div>
      <table className="settings-table advertisement-table">
        <thead><tr><th>소재</th><th>소재명</th><th>광고시간(초)</th><th>관리</th></tr></thead>
        <tbody>{advertisements.map(ad => <tr key={ad.id}>
          {["material", "materialName", "durationSeconds"].map((key, index) => <td key={key}><input aria-label={`광고 목록 ${["소재", "소재명", "광고시간(초)"][index]}`} type={key === "durationSeconds" ? "number" : "text"} min={key === "durationSeconds" ? "0" : undefined} step={key === "durationSeconds" ? "1" : undefined} value={ad[key]} onChange={event => setAdvertisements(current => current.map(item => item.id === ad.id ? { ...item, [key]: event.target.value } : item))} /></td>)}
          <td><button type="button" onClick={() => { if (window.confirm("이 광고를 목록에서 삭제할까요?")) setAdvertisements(current => current.filter(item => item.id !== ad.id)); }}>삭제</button></td>
        </tr>)}</tbody>
      </table>
      {!advertisements.length && <div className="empty-state"><p>광고 추가를 눌러 광고 목록을 등록해주세요.</p></div>}
    </section>
  </div>;
}
