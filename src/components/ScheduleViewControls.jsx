export function MaterialNameToggle({showNames,setShowNames}) {
  return <button type="button" aria-pressed={showNames} title="등록된 소재명으로 표시합니다. 이름이 없으면 ID를 표시합니다. 소재 셀 수정은 ID 보기에서 가능합니다." onClick={()=>setShowNames(value=>!value)}>{showNames ? "소재ID로 보기" : "소재명으로 보기"}</button>;
}
export default function ScheduleViewControls({query,setQuery,allDates,setAllDates,count,total,showNames,setShowNames}) {
  return <div className="schedule-view-controls">
    <label className="schedule-search">검색<input type="search" aria-label="운행표 전체 열 검색" value={query} onChange={event=>setQuery(event.target.value)} placeholder="소재ID·소재명·편성코드명 등 모든 열 검색" /></label>
    <MaterialNameToggle showNames={showNames} setShowNames={setShowNames} />
    <label className="schedule-search-scope"><input type="checkbox" checked={allDates} onChange={event=>setAllDates(event.target.checked)} />전체 날짜 검색</label>
    {query && <button type="button" onClick={()=>setQuery("")}>검색 초기화</button>}
    <span role="status" title="복사·내려받기·DB 저장은 소재ID 기준입니다.">{count} / {total}행</span>
  </div>;
}
