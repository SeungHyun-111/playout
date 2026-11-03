import { useState } from "react";
import useTimeBlockPersistence from "./hooks/useTimeBlockPersistence.js";
import DawonScheduleOutput from "./pages/DawonScheduleOutput.jsx";
import EpgOutput from "./pages/EpgOutput.jsx";
import OperationSettings from "./pages/OperationSettings.jsx";
import ScheduleWrite from "./pages/ScheduleWrite.jsx";
import TimeBlockInput, { createInitialTimeBlockGrid, timeBlockHeaders } from "./pages/TimeBlockInput.jsx";
import WorkMemo from "./pages/WorkMemo.jsx";

const navItems = [
  {
    id: "timeblock-input",
    number: "1.",
    label: "TimeBlock.입력",
    children: [
      {
        id: "epg-output",
        label: "EPG",
      },
      {
        id: "dawon-output",
        label: "다원방송송출일정",
      },
    ],
  },
  {
    id: "operation-settings",
    number: "2.",
    label: "운영설정",
    children: [
      {
        id: "settings-promotion",
        label: "프로모션",
      },
      {
        id: "settings-banner",
        label: "배너관리",
      },
      {
        id: "settings-caption",
        label: "주조자막의뢰정보",
      },
      {
        id: "settings-special-request",
        label: "특수요청",
      },
    ],
  },
  {
    id: "schedule-write",
    number: "3.",
    label: "운행표 작성",
  },
  {
    id: "work-memo",
    number: "9.",
    label: "메모",
  },
];

export default function App() {
  const [activePage, setActivePage] = useState("timeblock-input");
  const [timeBlockHeaderValues, setTimeBlockHeaderValues] = useState(timeBlockHeaders);
  const [timeBlockGrid, setTimeBlockGrid] = useState(() => createInitialTimeBlockGrid());
  useTimeBlockPersistence({
    headers: timeBlockHeaderValues,
    rows: timeBlockGrid,
    setHeaders: setTimeBlockHeaderValues,
    setRows: setTimeBlockGrid,
  });

  const renderPage = () => {
    if (activePage === "epg-output") return <EpgOutput headers={timeBlockHeaderValues} rows={timeBlockGrid} />;
    if (activePage === "dawon-output") {
      return <DawonScheduleOutput headers={timeBlockHeaderValues} rows={timeBlockGrid} />;
    }
    if (activePage === "operation-settings") return <OperationSettings sectionId="operation-settings" />;
    if (activePage.startsWith("settings-")) return <OperationSettings sectionId={activePage} />;
    if (activePage === "schedule-write") return <ScheduleWrite />;
    if (activePage === "work-memo") return <WorkMemo />;
    return (
      <TimeBlockInput
        headerValues={timeBlockHeaderValues}
        setHeaderValues={setTimeBlockHeaderValues}
        grid={timeBlockGrid}
        setGrid={setTimeBlockGrid}
      />
    );
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="페이지 네비게이션">
        <div className="brand">
          <span className="brand-mark">P</span>
          <div>
            <strong>Playout</strong>
            <span>운행표 생성</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const isGroupActive = activePage === item.id || item.children?.some((child) => child.id === activePage);

            return (
              <div className={`nav-group ${isGroupActive ? "active" : ""}`} key={item.id}>
                <button
                  className={`nav-item nav-parent ${activePage === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                >
                  <span>{item.number}</span>
                  {item.label}
                </button>

                {item.children && (
                  <div className="nav-children" aria-label={`${item.label} 하위 메뉴`}>
                    <div className="nav-section-label">{item.id === "operation-settings" ? "설정" : "출력"}</div>
                    {item.children.map((child) => (
                      <button
                        className={`nav-item nav-child ${activePage === child.id ? "active" : ""}`}
                        type="button"
                        key={child.id}
                        onClick={() => setActivePage(child.id)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <section className="page">
        {renderPage()}
      </section>
    </main>
  );
}
