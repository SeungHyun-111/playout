import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import CoachTour from "./components/CoachTour.jsx";
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
      <Sidebar items={navItems} activePage={activePage} onNavigate={setActivePage} />

      <section className="page">
        {renderPage()}
        {["schedule-write", "work-memo"].includes(activePage) && <CoachTour key={activePage} steps={[{
          target: ".page .output-page",
          title: activePage === "work-memo" ? "작업 메모" : "운행표 작성",
          description: activePage === "work-memo" ? "앞으로 작업할 내용과 우선순위를 확인하는 화면이에요." : "운행표 작성을 위한 화면이에요. TimeBlock 입력과 운영설정을 먼저 준비해주세요.",
        }]} />}
      </section>
    </main>
  );
}
