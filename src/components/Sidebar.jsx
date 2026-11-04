import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/sidebar.css";

const paths = {
  "timeblock-input": "M3 4h18v16H3z M3 9h18 M8 9v11 M15 9v11",
  "epg-output": "M3 5h18v13H3z M8 22l4-4 4 4 M7 9h4 M7 13h9",
  "dawon-output": "M4 4h16v17H4z M8 2v4 M16 2v4 M4 9h16 M8 13h3 M14 13h2 M8 17h3",
  "operation-settings": "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  "settings-promotion": "M3 10l17-6v16L3 14z M6 15l2 6h4l-2-5",
  "settings-exceptions": "M4 5h16 M4 12h16 M4 19h16 M8 3v4 M16 10v4 M11 17v4",
  "settings-banner": "M3 4h18v16H3z M7 8h.01 M3 17l6-6 4 4 3-3 5 5",
  "settings-event-card": "M4 4h16v17H4z M8 2v4 M16 2v4 M4 9h16 M8 13h3 M14 13h2 M8 17h3",
  "settings-caption": "M3 5h18v14H3z M6 10h5 M6 14h5 M14 10h4 M14 14h4",
  "settings-special-request": "M12 3l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1z",
  "schedule-write": "M14 4H4v17h17V11 M9 14l1-4 9-9 4 4-9 9z",
  "schedule-bulk": "M14 4H4v17h17V11 M9 14l1-4 9-9 4 4-9 9z",
  "schedule-master": "M3 4h18v14H3z M8 22h8 M12 18v4 M7 9h10 M7 13h6",
  "schedule-ads": "M3 10l17-6v16L3 14z M6 15l2 6h4l-2-5",
  "work-memo": "M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h4",
  "broadcast-qa": "M4 4h16v13H9l-5 4z M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4 M12 14h.01",
};
function Icon({ id }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[id] || paths["timeblock-input"]} /></svg>;
}

export default function Sidebar({ items, activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("playout.sidebar.collapsed") === "true"; } catch { return false; }
  });
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  const [tooltip,setTooltip]=useState(null);
  const tooltipId=useId();
  const showTooltip=(event,item)=>{
    if(!collapsed)return;
    const bounds=event.currentTarget.getBoundingClientRect();
    setTooltip({id:item.id,label:item.label,left:bounds.right+14,top:Math.max(28,Math.min(window.innerHeight-28,bounds.top+bounds.height/2))});
  };
  useEffect(()=>{
    const hide=()=>setTooltip(null);
    window.addEventListener("scroll",hide,true);window.addEventListener("resize",hide);
    return ()=>{window.removeEventListener("scroll",hide,true);window.removeEventListener("resize",hide);};
  },[]);

  useLayoutEffect(() => {
    const update = () => {
      const active = navRef.current?.querySelector('[aria-current="page"]');
      if (active) setIndicator({ top: active.offsetTop, height: active.offsetHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(navRef.current);
    return () => observer.disconnect();
  }, [activePage, collapsed]);

  const toggle = () => {
    setTooltip(null);
    setCollapsed(previous => {
      const next = !previous;
      try { localStorage.setItem("playout.sidebar.collapsed", String(next)); } catch { /* Storage may be disabled. */ }
      return next;
    });
  };

  const renderItem = (item, index, child = false) => <button
    key={item.id} type="button" className={`morph-nav-item ${child ? "is-child" : ""}`}
    aria-label={item.label} aria-current={activePage === item.id ? "page" : undefined}
    aria-describedby={tooltip?.id===item.id ? tooltipId : undefined}
    onMouseEnter={event=>showTooltip(event,item)} onMouseLeave={()=>setTooltip(null)}
    onFocus={event=>showTooltip(event,item)} onBlur={()=>setTooltip(null)}
    onKeyDown={event=>{if(event.key==="Escape")setTooltip(null);}}
    onClick={() => {setTooltip(null);onNavigate(item.id);}} style={{ "--reveal-delay": `${60 + index * 24}ms` }}>
    <span className="morph-nav-icon"><Icon id={item.id} /></span>
    <span className="morph-label">{item.label}</span>
  </button>;

  return <aside className={`sidebar morph-sidebar ${collapsed ? "is-collapsed" : ""}`} aria-label="페이지 네비게이션">
    <div className="morph-brand">
      <img className="morph-brand-icon" src={`${import.meta.env.BASE_URL}app-icon.png`} alt="Playout" />
      <div className="morph-label"><strong>Playout</strong><small>운행표 생성</small></div>
    </div>
    <button className="sidebar-toggle" type="button" aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"} aria-expanded={!collapsed} aria-controls="playout-navigation" onClick={toggle}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
    </button>
    <nav id="playout-navigation" className="morph-nav" ref={navRef}>
      {indicator && <span className="morph-active-indicator" aria-hidden="true" style={{ height: indicator.height, transform: `translateY(${indicator.top}px)` }} />}
      {items.map((item, index) => <div className="morph-nav-group" key={item.id}>
        <div className="morph-section"><span className="morph-label">{item.number} {index === 0 ? "편성 입력 · 출력" : item.label}</span><span className="morph-section-line" /></div>
        {item.id !== "schedule-write" && renderItem(item, index * 3)}
        {item.children?.map((child, childIndex) => renderItem(child, index * 3 + childIndex + 1, true))}
      </div>)}
    </nav>
    <div className="morph-footer"><span className="morph-status-dot" /><span className="morph-label">PLAYOUT WORKSPACE</span></div>
    {collapsed && tooltip && createPortal(<div id={tooltipId} role="tooltip" className="morph-tooltip morph-tooltip-floating" style={{left:tooltip.left,top:tooltip.top}}>{tooltip.label}</div>,document.body)}
  </aside>;
}
