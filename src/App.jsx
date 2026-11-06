import { useState } from "react";
import useScheduleSettings from "./hooks/useScheduleSettings.js";
import useRtdbValue from "./hooks/useRtdbValue.js";
import { buildBulk, buildMaster } from "./lib/scheduleFlow.js";
import Sidebar from "./components/Sidebar.jsx";
import MaterialConflicts from "./pages/MaterialConflicts.jsx";
import MasterSchedule from "./pages/MasterSchedule.jsx";
import AdvertisementSettings from "./pages/AdvertisementSettings.jsx";
import BulkRegistration from "./pages/BulkRegistration.jsx";
import { TourProvider } from "./components/CoachTour.jsx";
import useTimeBlockPersistence from "./hooks/useTimeBlockPersistence.js";
import DawonScheduleOutput from "./pages/DawonScheduleOutput.jsx";
import EpgOutput from "./pages/EpgOutput.jsx";
import OperationSettings from "./pages/OperationSettings.jsx";
import TimeBlockInput, { createInitialTimeBlockGrid, timeBlockHeaders } from "./pages/TimeBlockInput.jsx";
import WorkMemo from "./pages/WorkMemo.jsx";
import WorkspaceBoard from "./pages/WorkspaceBoard.jsx";
import { buildMaterialNames } from "./lib/scheduleView.js";
import useMasterComments from "./hooks/useMasterComments.js";
import { applyMasterComments } from "./lib/masterComments.js";

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
      { id:"settings-exceptions",label:"예외설정" },
      {
        id: "settings-promotion",
        label: "프로모션",
      },
      {
        id: "settings-event-card",
        label: "행사카드 일정",
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
    id: "material-conflicts",
    label: "소재 충돌 오류 예측",
    standalone: true,
    tone: "danger",
  },
  {
    id: "schedule-write",
    number: "3.",
    label: "운행표 생성",
    children: [
      { id: "schedule-bulk", label: "내부 일괄등록" },
      { id: "schedule-ads", label: "광고 설정" },
      { id: "schedule-master", label: "주조 운행표" },
    ],
  },
  {
    id: "work-memo",
    number: "9.",
    label: "메모",
    children: [{id:"broadcast-qa",label:"송출 Q&A"}],
  },
];

export default function App() {
  const [activePage, setActivePage] = useState("timeblock-input");
  const [timeBlockHeaderValues, setTimeBlockHeaderValues] = useState(timeBlockHeaders);
  const [timeBlockGrid, setTimeBlockGrid] = useState(() => createInitialTimeBlockGrid());
  const { settings, error: settingsError } = useScheduleSettings();
  const [bulkEdits, setBulkEdits] = useState({overrides:{},extraRows:[]});
  useRtdbValue("bulkRegistration/edits",bulkEdits,setBulkEdits);
  const bulkRecords=buildBulk(timeBlockHeaderValues,timeBlockGrid,settings,bulkEdits);
  const {comments:masterComments,setComment,loaded:commentsLoaded,error:commentsError}=useMasterComments();
  const masterEntries=applyMasterComments(buildMaster(bulkRecords,settings,{structured:true}),masterComments);
  const masterRows=masterEntries.map(entry=>entry.values);
  const materialNames=buildMaterialNames(timeBlockHeaderValues,timeBlockGrid,settings);
  const updateBulkRows = update => {
    const previous=bulkRecords.map(record=>record.values);
    const next=typeof update === "function" ? update(previous) : update;
    setBulkEdits(current=>{
      const overrides={...(current.overrides||{})};
      const extraRows=[];
      next.forEach((row,index)=>{
        const record=bulkRecords[index];
        if(!record || record.id.startsWith("manual-")) {
          extraRows.push({id:record?.id || `manual-${crypto.randomUUID()}`,values:row}); return;
        }
        const changes={...(overrides[record.id]||{})};
        row.forEach((value,col)=>{if(value!==previous[index][col])changes[col]=value;});
        if(Object.keys(changes).length)overrides[record.id]=changes;
      });
      return {overrides,extraRows};
    });
  };
  useTimeBlockPersistence({
    headers: timeBlockHeaderValues,
    rows: timeBlockGrid,
    setHeaders: setTimeBlockHeaderValues,
    setRows: setTimeBlockGrid,
  });

  const renderPage = () => {
    if (activePage === "material-conflicts") return <MaterialConflicts settings={settings} error={settingsError} onNavigate={setActivePage} />;
    if (activePage === "epg-output") return <EpgOutput headers={timeBlockHeaderValues} rows={timeBlockGrid} />;
    if (activePage === "dawon-output") {
      return <DawonScheduleOutput headers={timeBlockHeaderValues} rows={timeBlockGrid} />;
    }
    if (activePage === "operation-settings") return <OperationSettings sectionId="operation-settings" onNavigate={setActivePage} />;
    if (activePage.startsWith("settings-")) return <OperationSettings sectionId={activePage} onNavigate={setActivePage} />;
    if (activePage === "schedule-master") return <MasterSchedule rows={masterRows} entries={masterEntries} materialNames={materialNames} setComment={setComment} commentsLoaded={commentsLoaded} commentsError={commentsError} sourceSnapshot={{timeBlock:{headers:timeBlockHeaderValues,rows:timeBlockGrid},settings,bulkEdits,masterComments}} error={settingsError} />;
    if (activePage === "schedule-ads") return <AdvertisementSettings />;
    if (["schedule-write", "schedule-bulk"].includes(activePage)) {
      return <BulkRegistration rows={bulkRecords.map(record=>record.values)} materialNames={materialNames} setRows={updateBulkRows} reset={() => setBulkEdits({overrides:{},extraRows:[]})} error={settingsError} />;
    }
    if (activePage === "work-memo") return <WorkMemo />;
    if (activePage === "broadcast-qa") return <WorkspaceBoard key="broadcastQa" collection="broadcastQa" />;
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
    <TourProvider activePage={activePage} onNavigate={setActivePage}><main className="app-shell">
      <Sidebar items={navItems} activePage={activePage} onNavigate={setActivePage} />

      <section className="page">
        {renderPage()}

      </section>
    </main></TourProvider>
  );
}
