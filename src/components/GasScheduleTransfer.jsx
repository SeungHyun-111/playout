import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './GasScheduleTransfer.css';
import { gasArchiveEntries, gasChannels, gasSchedules, sendGasSchedule } from '../lib/gasSchedule.js';
import { saveMasterSchedule } from '../lib/saveMasterSchedule.js';

export default forwardRef(function GasScheduleTransfer({ entries, sourceSnapshot, disabled, onBusyChange }, ref) {
  const [mode, setMode] = useState(null);
  const [selected, setSelected] = useState([]);
  const [url, setUrl] = useState('https://script.google.com/macros/s/AKfycbzKOxIVzh22kC1fgoG2R_scEFRZM3oaluBiWzjerHxHdLqvF9p7HX6ciLPX8nIpPLVffg/exec');
  const [outcome, setOutcome] = useState('');
  const [diagnostics, setDiagnostics] = useState([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const pending = useRef(false);
  const dialogRef = useRef(null);
  const channels = gasChannels(entries);
  const schedules = gasSchedules(entries, selected);
  useEffect(() => {
    if (mode && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [mode]);
  useEffect(() => { try { sessionStorage.removeItem('playout.gas.token'); } catch { /* Optional storage. */ } }, []);
  useImperativeHandle(ref, () => ({ open: nextMode => {
    if (!pending.current) { setSelected(channels); setMode(nextMode); setStatus(''); setResults([]); setOutcome(''); setDiagnostics([]); }
  } }));
  const transfer = async () => {
    if (pending.current || !schedules.length) return;
    pending.current = true;
    setSending(true);
    onBusyChange(true);
    setResults([]);
    setDiagnostics([]);
    setOutcome('sending');
    const completed = [];
    let archived = false;
    let activeSchedule;
    try {
      // 구글에 전송하는 채널·날짜에 해당하는 원본 행을 중복 없이 보관합니다.
      const archiveEntries = gasArchiveEntries(entries, schedules);
      setStatus('운행표를 RTDB에 저장 중…');
      await saveMasterSchedule(archiveEntries, sourceSnapshot);
      archived = true;
      for (const schedule of schedules) {
        activeSchedule = schedule;
        setStatus(`${completed.length + 1}/${schedules.length} · ${schedule.broadcastDate} / ${schedule.channel} 전송 중…`);
        const result = await sendGasSchedule({ url: url.trim(), mode, schedule });
        setDiagnostics(current => [...current, { label: `${schedule.broadcastDate} / ${schedule.channel}`, ...result }]);
        completed.push(result);
        setResults([...completed]);
      }
      setStatus(`RTDB 저장 완료 · 구글 시트 ${completed.length}개 탭 생성 완료`);
      setOutcome('success');
    } catch (failure) {
      setOutcome(failure.outcome === 'unknown' ? 'unknown' : 'failed');
      if (failure.diagnostics) setDiagnostics(current => [...current, { label: `${activeSchedule.broadcastDate} / ${activeSchedule.channel}`, ...failure.diagnostics }]);
      setStatus(archived
        ? `RTDB 저장 완료 · 구글 시트 ${completed.length}/${schedules.length}개 완료. ${activeSchedule?.broadcastDate || ''} / ${activeSchedule?.channel || ''}: ${failure.diagnostics?.stage ? '[' + failure.diagnostics.stage + '] ' : ''}${failure.message}`
        : `RTDB 저장 실패: ${failure.message} 구글 전송은 시작하지 않았습니다.`);
    } finally {
      pending.current = false;
      setSending(false);
      onBusyChange(false);
    }
  };
  if (!mode) return null;
  return createPortal(<dialog ref={dialogRef} className="gas-transfer-dialog" aria-labelledby="gas-transfer-title" onCancel={event => { if (sending) event.preventDefault(); else setMode(null); }}>
    <header className="gas-dialog-heading"><div><span className="gas-eyebrow">GOOGLE SHEETS</span><h2 id="gas-transfer-title">{mode === 'initial' ? '구글 내보내기' : '수정 운행표 내보내기'}</h2><p>{mode === 'initial' ? '주조정실에서 볼 운행표를 새로 만듭니다.' : '기존 운행표는 남기고 수정본을 추가합니다.'}</p></div><button className="gas-close" type="button" aria-label="내보내기 창 닫기" disabled={sending} onClick={() => setMode(null)}>×</button></header>
    <fieldset disabled={sending}>
      <section className="gas-dates"><span className="gas-section-label">방송일자</span><div>{[...new Set(entries.map(entry => entry.values[1]))].map(date => <span key={date}>{date}</span>)}</div></section>
      <div className="gas-channel-heading"><span className="gas-section-label">내보낼 채널</span><button type="button" onClick={() => setSelected(selected.length === channels.length ? [] : channels)}>{selected.length === channels.length ? '선택 해제' : '모두 선택'}</button></div>
      <div className="gas-channel-options" role="group" aria-label="전송할 채널">
        {channels.map(channel => <label className={selected.includes(channel) ? 'selected' : ''} key={channel}><input type="checkbox" checked={selected.includes(channel)} onChange={event => setSelected(current => event.target.checked ? [...current, channel] : current.filter(value => value !== channel))} /><span>채널 <strong>{channel}</strong></span><span className="gas-channel-check">✓</span></label>)}
        {!channels.length && <span>선택한 날짜에 생성된 개별 채널 값이 없습니다.</span>}
      </div>
      <p className="gas-common-note">‘전체’ 방송은 각 채널에 공통으로 포함됩니다.</p>
      <details className="gas-connection">
        <summary>연결 설정 <span>웹 앱 연결됨</span></summary>
        <label>웹 앱 주소<input type="url" value={url} onChange={event => setUrl(event.target.value)} /></label>
      </details>
      <div className="gas-dialog-footer">
        <div><strong>{schedules.length}개 탭 생성</strong><span>RTDB에도 최신 운행표를 저장합니다.</span></div>
        <button className="gas-submit" type="button" disabled={disabled || !schedules.length || !url.trim()} onClick={transfer}>{sending ? '내보내는 중…' : mode === 'initial' ? '구글로 내보내기 ↗' : '수정본 내보내기 ↗'}</button>
      </div>
    </fieldset>
    {status && <div className={`gas-result ${outcome}`} role={outcome === 'failed' || outcome === 'unknown' ? 'alert' : 'status'}><strong>{({ sending: '전송 중', success: '전송 성공', failed: '전송 실패', unknown: '전송 결과 확인 불가' })[outcome]}</strong><p>{status}</p></div>}
    {diagnostics.length > 0 && <details className="gas-diagnostics"><summary>GAS 실행 로그 보기</summary>{diagnostics.map((item, index) => <section key={index}><strong>{item.label} · {item.ok ? '성공' : '실패'}</strong><p>요청 ID: {item.requestId || '없음'} / 단계: {item.stage || '완료'}</p><pre>{(item.logs || []).join('\n') || '이 배포 버전은 실행 로그를 반환하지 않습니다.'}</pre></section>)}</details>}
    {results.length > 0 && <ul>{results.map(result => <li key={result.sheetId}><a href={result.url} target="_blank" rel="noreferrer">{result.sheetName}</a></li>)}</ul>}
  </dialog>, document.body);
});
