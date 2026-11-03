export default function DateSelection({ dates, selected, setSelected }) {
  const active = selected === null ? dates : dates.filter(date=>selected.includes(date));
  return <div className="date-selection" role="group" aria-label="방송일자 선택">
    <strong>방송일자</strong>
    <button type="button" className={selected === null ? "is-selected" : ""} onClick={()=>setSelected(null)}>전체</button>
    <button type="button" onClick={()=>setSelected([])}>선택 해제</button>
    <div className="date-selection-options">
      {dates.map(date=><label key={date} className={active.includes(date) ? "is-selected" : ""}>
        <input type="checkbox" checked={active.includes(date)} onChange={event=>setSelected(event.target.checked ? [...active,date] : active.filter(value=>value!==date))} />
        {date ? date.replaceAll("-","/") : "날짜 없음"}
      </label>)}
      {!dates.length && <span>입력된 날짜가 없습니다.</span>}
    </div>
    <span className="date-selection-count">{active.length}/{dates.length} 선택 · 복수 선택 가능</span>
  </div>;
}
