import { useEffect, useState } from "react";
import CoachTour from "../components/CoachTour.jsx";
import SimpleSettingsTable from "../components/SimpleSettingsTable.jsx";
import useRtdbValue from "../hooks/useRtdbValue.js";

const promotionColumns = [
  { key: "promotionName", label: "프로모션명" },
  { key: "startDate", label: "시작일", type: "date" },
  { key: "endDate", label: "종료일", type: "date" },
  { key: "material1", label: "소재1", type: "select", coachId: "promotion-material-1" },
  { key: "material2", label: "소재2", type: "select", coachId: "promotion-material-2" },
  { key: "material3", label: "소재3", type: "select", coachId: "promotion-material-3" },
  { key: "material4", label: "소재4", coachId: "promotion-material-4" },
  { key: "note", label: "비고" },
];

const plannedPgmColumns = [
  { key: "plannedPgmName", label: "기획PGM명" },
  { key: "startDate", label: "시작일", type: "date" },
  { key: "endDate", label: "종료일", type: "date" },
  { key: "material1", label: "소재1", type: "select" },
  { key: "material2", label: "소재2", type: "select" },
  { key: "material3", label: "소재3", type: "select" },
  { key: "material4", label: "소재4", type: "select" },
  { key: "note", label: "비고" },
];

const specialRequestColumns = [
  {
    key: "pgmDateTime",
    label: "PGM 방송일시",
    type: "datetimePicker",
    width: "230px",
  },
  { key: "programName", label: "편성코드명" },
  { key: "material1", label: "소재1" },
  { key: "material2", label: "소재2" },
  { key: "material3", label: "소재3" },
  { key: "material4", label: "소재4" },
  { key: "note", label: "비고" },
];

const captionRequestColumns = [
  { key: "scheduleDateTime", label: "편성일시" },
  { key: "productName", label: "상품명" },
  { key: "requestContent", label: "의뢰내용" },
  { key: "requestDetail", label: "의뢰상세내용" },
  { key: "materialId", label: "(작업파일)소재ID", type: "select" },
];

const bannerColumns = [
  { key: "materialId", label: "소재ID" },
  { key: "materialName", label: "소재명" },
  {
    key: "positionType",
    label: "위치구분",
    type: "select",
    options: [
      { value: "카드배너", label: "카드배너" },
      { value: "CI배너", label: "CI배너" },
      { value: "L바", label: "L바" },
      { value: "스크롤", label: "스크롤" },
    ],
  },
];

const bannerScheduleColumns = [
  { key: "eventCard", label: "행사카드", type: "select" },
  { key: "startDate", label: "시작일", type: "date" },
  { key: "endDate", label: "종료일", type: "date" },
  { key: "materialId", label: "배너소재", type: "select" },
];

const defaultMaterialColumns = [
  { key: "materialType", label: "구분", readOnly: true },
  { key: "material1", label: "소재1", readOnly: true },
  { key: "material2", label: "소재2", type: "select" },
  { key: "material3", label: "소재3", type: "select" },
  { key: "material4", label: "소재4", type: "select" },
];

const disabledMdColumns = [{ key: "mdCategory", label: "MD분류" }];

const defaultDisabledMdCategories = [
  "정보방송",
  "옴부즈맨",
  "여행",
  "렌탈",
  "렌터카",
  "보험",
  "가전서비스",
  "무형(기획형)",
];

const priorityItems = [
  {
    id: "specialRequest",
    label: "특수요청",
    condition: "방송일시 & 편성코드 일치",
    path: "settings-special-request",
  },
  {
    id: "promotion",
    label: "프로모션",
    condition: "편성코드 일치",
    path: "settings-promotion",
  },
  {
    id: "plannedPgm",
    label: "기획PGM",
    condition: "프로그램명 일치",
    path: "settings-promotion",
  },
  {
    id: "eventCard",
    label: "행사카드",
    condition: "일자 일치",
    path: "settings-banner",
  },
  {
    id: "captionRequest",
    label: "주조자막의뢰정보",
    condition: "\"2026/07/30 01:31 ~ 02:11\" 양식의 편성일시 시작시간 일치",
    path: "settings-caption",
  },
];

const defaultBannerRows = [
  ["0F001135", "신규바(25일~)_좌상단 국민"],
  ["0F001136", "신규바(25일~)_좌상단 농협"],
  ["0F001137", "신규바(25일~)_좌상단 롯데"],
  ["0F001138", "신규바(25일~)_좌상단 삼성"],
  ["0F001139", "신규바(25일~)_좌상단 우리"],
  ["0F001140", "신규바(25일~)_좌상단 하나"],
  ["0F001141", "신규바(25일~)_좌상단 현대"],
  ["0F001147", "신규바(25일~)_좌상단 국민+삼성"],
  ["0F001148", "신규바(25일~)_좌상단 롯데+삼성"],
  ["0F001149", "신규바(25일~)_좌상단 삼성+농협"],
  ["0F001150", "신규바(25일~)_좌상단 하나+농협"],
  ["0F001151", "신규바(25일~)_좌상단 우리+하나"],
  ["0F001161", "신규바(25일~)_좌상단 하나+롯데"],
  ["0F001170", "신규바(25일~)_좌상단 하나+국민"],
  ["0F001171", "신규바(25일~)_좌상단 농협+우리"],
  ["0F001187", "신규바(25일~)_좌상단 삼성+우리"],
  ["0F001188", "신규바(25일~)_좌상단 국민+우리"],
  ["0F001197", "신규바(25일~)_좌상단 농협+롯데"],
  ["0F001170", "신규바(25일~)_좌상단 국민+하나"],
  ["0F001239", "신규바(25일~)_좌상단 하나+삼성"],
  ["0F001279", "신규바(25일~)_좌상단 우리+롯데 5%"],
  ["0F001336", "삼성+롯데7%"],
  ["0F001304", "좌상단 국민+롯데 카드"],
  ["0F001320", "신한+삼성 카드"],
  ["0F001321", "신한+국민 카드"],
  ["0F001322", "좌상단 국민+하나+롯데 카드"],
  ["0F001333", "좌상단 국민+농협"],
  ["0F001339", "좌상단 국민+하나+삼성"],
  ["0F001336", "26년 7월 오픈런삼성7%"],
  ["0F001349", "취향상점 삼성7%"],
  ["0F001348", "취향상점 국민7%"],
  ["0F001350", "취향상점 하나7%"],
  ["0F001351", "취향상점 롯데7%"],
  ["0F001363", "우리카드 7%"],
  ["0F001367", "국민+농협+삼성5%"],
  ["0F001366", "국민+우리+삼성5%"],
  ["0F001312", "휴일배송"],
  ["0F001311", "오늘배송(특화배송)"],
  ["0F001126", "기본CI"],
  ["0F001127", "기본CI 내일배송"],
  ["0F001346", "취향상점 CI+본방송"],
  ["0F001347", "취향상점 CI(재방송)"],
  ["0F001335", "[L바] 8월 스토아 오픈런(8/7~9)"],
  ["0F001365", "[L바] 오픈런 일타쇼(8/7~9)"],
  ["0F001371", "[L바] 8월 웰니스 오픈런(8/21~23)"],
  ["0F001363", "좌상단 우리카드 7%(일타쇼)"],
];

const defaultBannerScheduleRows = [
  ["농협+롯데", "2026-08-01", "2026-08-05", "0F001197"],
  ["농협", "2026-08-06", "2026-08-06", "0F001136"],
  ["삼성7%", "2026-08-07", "2026-08-09", "0F001336"],
  ["우리", "2026-08-10", "2026-08-10", "0F001139"],
  ["삼성", "2026-08-11", "2026-08-16", "0F001138"],
  ["농협", "2026-08-17", "2026-08-17", "0F001136"],
  ["국민+농협", "2026-08-18", "2026-08-19", "0F001333"],
  ["국민", "2026-08-20", "2026-08-22", "0F001135"],
  ["국민+우리", "2026-08-23", "2026-08-23", "0F001188"],
  ["삼성+우리", "2026-08-24", "2026-08-24", "0F001187"],
  ["삼성", "2026-08-25", "2026-08-31", "0F001138"],
];

const sections = {
  "operation-settings": {
    title: "운영설정",
    description: "출력물 생성에 필요한 공통 설정을 관리합니다.",
    emptyTitle: "운영설정",
    emptyText: "왼쪽 하위 메뉴에서 프로모션, 배너관리, 주조자막의뢰정보를 선택하세요.",
  },
  "settings-promotion": {
    title: "프로모션",
    description: "방송 편성에 붙는 프로모션 기준과 예외를 관리합니다.",
    emptyTitle: "프로모션 관리",
    emptyText: "프로모션명, 적용 조건, 예외 메모를 관리하는 화면입니다.",
  },
  "settings-banner": {
    title: "배너관리",
    description: "PGM 배너 여부와 배너 운영 기준을 관리합니다.",
    emptyTitle: "배너관리",
    emptyText: "PGM 배너 표시 여부와 배너 운영값을 관리하는 화면입니다.",
  },
  "settings-caption": {
    title: "주조자막의뢰정보",
    description: "주조 자막 의뢰에 필요한 정보를 붙여넣어 관리합니다.",
    emptyTitle: "주조자막의뢰정보",
    emptyText: "편성일시, 상품명, 의뢰내용, 소재ID를 붙여넣어 관리하는 화면입니다.",
  },
  "settings-special-request": {
    title: "특수요청",
    description: "특정 PGM 방송일시에 적용할 소재 요청 정보를 관리합니다.",
    emptyTitle: "특수요청",
    emptyText: "PGM 방송일시, 편성코드명, 소재와 비고를 관리하는 화면입니다.",
  },
};

export default function OperationSettings({ sectionId }) {
  const [promotionRows, setPromotionRows] = useState(() => [createPromotionRow()]);
  const [plannedPgmRows, setPlannedPgmRows] = useState(() => [createPlannedPgmRow()]);
  const [selectedPromotionIndex, setSelectedPromotionIndex] = useState(0);
  const [bannerRows, setBannerRows] = useState(() => createBannerRows());
  const [bannerScheduleRows, setBannerScheduleRows] = useState(() => createBannerScheduleRows());
  const [captionRequestRows, setCaptionRequestRows] = useState(() => createCaptionRequestRows());
  const [specialRequestRows, setSpecialRequestRows] = useState(() => [createSpecialRequestRow()]);
  const [defaultMaterialRows, setDefaultMaterialRows] = useState(() => createDefaultMaterialRows());
  const [disabledMdRows, setDisabledMdRows] = useState(() => createDisabledMdRows());
  const [priorityOrder, setPriorityOrder] = useState(() => priorityItems.map((item) => item.id));
  const [draggingPriorityId, setDraggingPriorityId] = useState(null);
  useRtdbValue("settings/promotion", promotionRows, setPromotionRows);
  useRtdbValue("settings/plannedPgm", plannedPgmRows, setPlannedPgmRows);
  useRtdbValue("settings/bannerMaterials", bannerRows, setBannerRows);
  useRtdbValue("settings/bannerSchedules", bannerScheduleRows, setBannerScheduleRows);
  useRtdbValue("settings/captionRequests", captionRequestRows, setCaptionRequestRows);
  useRtdbValue("settings/specialRequests", specialRequestRows, setSpecialRequestRows);
  useRtdbValue("settings/defaultMaterials", defaultMaterialRows, setDefaultMaterialRows);
  useRtdbValue("settings/disabledMdCategories", disabledMdRows, setDisabledMdRows);
  useRtdbValue("settings/priorityOrder", priorityOrder, setPriorityOrder);

  useEffect(() => {
    const normalizedRows = normalizeDefaultMaterialRows(defaultMaterialRows);
    if (JSON.stringify(normalizedRows) !== JSON.stringify(defaultMaterialRows)) {
      setDefaultMaterialRows(normalizedRows);
    }
  }, [defaultMaterialRows]);
  const section = sections[sectionId] ?? sections["operation-settings"];
  const coachSteps = [
    {
      target: '[data-coach="operation-settings-panel"]',
      title: section.title,
      description: section.description,
    },
  ];
  if (sectionId === "settings-promotion") {
    coachSteps.push({
      target: '[data-coach="promotion-program-names"]',
      title: "편성코드명 일괄 입력",
      description: "엑셀에서 편성코드명 목록을 복사해 첫 칸에 붙여넣으면 아래로 한 번에 입력됩니다.",
    });
    coachSteps.push(
      {
        target: '[data-coach="promotion-material-1"]',
        title: "소재1: 카드배너",
        description: "카드배너 소재입니다. 시작시간은 55초 기준으로 확인하세요.",
      },
      {
        target: '[data-coach="promotion-material-2"]',
        title: "소재2: SKstoa CI배너",
        description: "SKstoa CI배너 소재입니다. 시작시간은 1분 기준으로 확인하세요.",
      },
      {
        target: '[data-coach="promotion-material-3"]',
        title: "소재3: 프로모션바",
        description: "프로모션바 소재입니다. 시작시간 3분, 캠페인 2분 기준으로 확인하세요.",
      },
      {
        target: '[data-coach="promotion-material-4"]',
        title: "소재4: 플로팅배너 4~5",
        description: "플로팅배너 4~5 소재입니다. 스크롤 OR 주조의뢰와 시작시간 요청사항 여부를 확인하세요.",
      },
    );
  }

  const updatePromotionCell = (rowIndex, key, value) => {
    setPromotionRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const addPromotionRow = () => {
    setPromotionRows((current) => [...current, createPromotionRow()]);
    setSelectedPromotionIndex(promotionRows.length);
  };

  const deletePromotionRow = (rowIndex) => {
    setPromotionRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : [createPromotionRow()];
    });
    setSelectedPromotionIndex((current) => Math.max(0, Math.min(current, promotionRows.length - 2)));
  };

  const updateProgramName = (rowIndex, value) => {
    setPromotionRows((current) =>
      current.map((promotion, promotionIndex) => {
        if (promotionIndex !== selectedPromotionIndex) return promotion;
        return {
          ...promotion,
          programNames: getPromotionProgramNames(promotion).map((row, index) =>
            index === rowIndex ? { ...row, value } : row,
          ),
        };
      }),
    );
  };

  const pasteProgramNames = (event, startRow) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\n") && !text.includes("\t")) return;

    event.preventDefault();
    const values = text
      .replace(/\r/g, "")
      .replace(/\n$/, "")
      .split("\n")
      .map((line) => line.split("\t")[0] ?? "");

    setPromotionRows((current) =>
      current.map((promotion, promotionIndex) => {
        if (promotionIndex !== selectedPromotionIndex) return promotion;

        const nextRows = [...getPromotionProgramNames(promotion)];
        while (nextRows.length < startRow + values.length) {
          nextRows.push(createProgramNameRow());
        }
        values.forEach((value, offset) => {
          nextRows[startRow + offset] = { ...nextRows[startRow + offset], value };
        });
        return { ...promotion, programNames: nextRows };
      }),
    );
  };

  const clearProgramNames = () => {
    setPromotionRows((current) =>
      current.map((promotion, promotionIndex) =>
        promotionIndex === selectedPromotionIndex
          ? { ...promotion, programNames: createProgramNameRows() }
          : promotion,
      ),
    );
  };

  const updatePlannedPgmCell = (rowIndex, key, value) => {
    setPlannedPgmRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const addPlannedPgmRow = () => {
    setPlannedPgmRows((current) => [...current, createPlannedPgmRow()]);
  };

  const deletePlannedPgmRow = (rowIndex) => {
    setPlannedPgmRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : [createPlannedPgmRow()];
    });
  };

  const updateSpecialRequestCell = (rowIndex, key, value) => {
    setSpecialRequestRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const updateCaptionRequestCell = (rowIndex, key, value) => {
    setCaptionRequestRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const addCaptionRequestRow = () => {
    setCaptionRequestRows((current) => [...current, ...createCaptionRequestRows(10)]);
  };

  const deleteCaptionRequestRow = (rowIndex) => {
    setCaptionRequestRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : createCaptionRequestRows();
    });
  };

  const pasteCaptionRequests = (event, startRow, startCol) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\n") && !text.includes("\t")) return;

    event.preventDefault();
    const pastedRows = text
      .replace(/\r/g, "")
      .replace(/\n$/, "")
      .split("\n")
      .map((line) => line.split("\t"));

    setCaptionRequestRows((current) => {
      const nextRows = [...current];
      while (nextRows.length < startRow + pastedRows.length) {
        nextRows.push(createCaptionRequestRow());
      }

      pastedRows.forEach((row, rowOffset) => {
        row.forEach((value, colOffset) => {
          const column = captionRequestColumns[startCol + colOffset];
          if (!column) return;
          nextRows[startRow + rowOffset] = {
            ...nextRows[startRow + rowOffset],
            [column.key]: value,
          };
        });
      });

      return nextRows;
    });
  };

  const updateBannerCell = (rowIndex, key, value) => {
    setBannerRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const updateBannerScheduleCell = (rowIndex, key, value) => {
    setBannerScheduleRows((current) =>
      current.map((row, index) => {
        if (index !== rowIndex) return row;
        if (key !== "eventCard") return { ...row, [key]: value };

        const banner = bannerRows.find((item) => item.materialName === value);
        return {
          ...row,
          eventCard: value,
          materialId: banner?.materialId ?? row.materialId,
        };
      }),
    );
  };

  const addBannerScheduleRow = () => {
    setBannerScheduleRows((current) => [...current, createBannerScheduleRow()]);
  };

  const deleteBannerScheduleRow = (rowIndex) => {
    setBannerScheduleRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : [createBannerScheduleRow()];
    });
  };

  const addBannerRow = () => {
    setBannerRows((current) => [...current, createBannerRow()]);
  };

  const deleteBannerRow = (rowIndex) => {
    setBannerRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : [createBannerRow()];
    });
  };

  const addSpecialRequestRow = () => {
    setSpecialRequestRows((current) => [...current, createSpecialRequestRow()]);
  };

  const deleteSpecialRequestRow = (rowIndex) => {
    setSpecialRequestRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : [createSpecialRequestRow()];
    });
  };

  const updateDefaultMaterialCell = (rowIndex, key, value) => {
    setDefaultMaterialRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const updateDisabledMdCell = (rowIndex, key, value) => {
    setDisabledMdRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const addDisabledMdRow = () => {
    setDisabledMdRows((current) => [...current, createDisabledMdRow()]);
  };

  const deleteDisabledMdRow = (rowIndex) => {
    setDisabledMdRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : [createDisabledMdRow()];
    });
  };

  const normalizedPriorityOrder = normalizePriorityOrder(priorityOrder);
  const priorityCards = normalizedPriorityOrder.map((id) => priorityItems.find((item) => item.id === id));
  const bannerOptions = createBannerOptions(bannerRows, { showName: true });

  const movePriorityCard = (targetId) => {
    if (!draggingPriorityId || draggingPriorityId === targetId) return;

    setPriorityOrder((current) => {
      const nextOrder = normalizePriorityOrder(current);
      const fromIndex = nextOrder.indexOf(draggingPriorityId);
      const toIndex = nextOrder.indexOf(targetId);
      if (fromIndex < 0 || toIndex < 0) return nextOrder;

      const [movedItem] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, movedItem);
      return nextOrder;
    });
  };

  const renderContent = () => {
    if (sectionId === "operation-settings") {
      return (
        <section className="priority-board" data-coach="operation-settings-panel">
          <header>
            <strong>우선순위</strong>
            <span>왼쪽일수록 먼저 적용됩니다.</span>
          </header>
          <div className="priority-card-row">
            {priorityCards.map((item, index) => (
              <article
                className={`priority-card ${draggingPriorityId === item.id ? "dragging" : ""}`}
                data-priority-id={item.id}
                draggable
                key={item.id}
                onDragStart={(event) => {
                  setDraggingPriorityId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  movePriorityCard(item.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingPriorityId(null);
                }}
                onDragEnd={() => setDraggingPriorityId(null)}
              >
                <span>{index + 1}</span>
                <strong>{item.label}</strong>
                <em>적용 조건: {item.condition}</em>
              </article>
            ))}
          </div>
          <div className="priority-note">
            <p>* 특수요청은 전체정보, 외에는 입력소재 부분만 적용됩니다.</p>
            <p>ex. 특수요청 소재1~4 전체 공란일시, 전체 배너 미설정</p>
          </div>
          <section className="default-settings-panel">
            <header>
              <strong>기본셋팅</strong>
              <span>* 위 설정이 없을시 아래로 설정</span>
            </header>
            <div className="default-settings-grid">
              <section className="default-materials-section">
                <h2>기본 소재</h2>
                <SimpleSettingsTable
                  columns={defaultMaterialColumns.map((column) =>
                    column.type === "select" ? { ...column, options: bannerOptions } : column,
                  )}
                  rows={defaultMaterialRows}
                  onChange={updateDefaultMaterialCell}
                  hideManagement
                />
              </section>
              <section>
                <h2>카드배너 미운영</h2>
                <SimpleSettingsTable
                  columns={disabledMdColumns}
                  rows={disabledMdRows}
                  onChange={updateDisabledMdCell}
                  onAddRow={addDisabledMdRow}
                  onDeleteRow={deleteDisabledMdRow}
                />
              </section>
            </div>
          </section>
        </section>
      );
    }

    if (sectionId === "settings-promotion") {
      const selectedPromotion = promotionRows[selectedPromotionIndex] ?? promotionRows[0] ?? createPromotionRow();
      const selectedProgramNames = getPromotionProgramNames(selectedPromotion);
      const selectedPromotionName = selectedPromotion.promotionName || `프로모션 ${selectedPromotionIndex + 1}`;
      const bannerOptions = createBannerOptions(bannerRows, { showName: true });
      const columns = promotionColumns.map((column) =>
        ["material1", "material2", "material3"].includes(column.key) ? { ...column, options: bannerOptions } : column,
      );
      const plannedColumns = plannedPgmColumns.map((column) =>
        ["material1", "material2", "material3", "material4"].includes(column.key)
          ? { ...column, options: bannerOptions }
          : column,
      );

      return (
        <div className="promotion-page-layout">
          <div className="promotion-settings-layout">
            <SimpleSettingsTable
              columns={columns}
              rows={promotionRows}
              onChange={updatePromotionCell}
              onAddRow={addPromotionRow}
              onDeleteRow={deletePromotionRow}
              coachId="operation-settings-panel"
              selectedRowIndex={selectedPromotionIndex}
              onSelectRow={setSelectedPromotionIndex}
            />
            <section className="program-name-panel" data-coach="promotion-program-names">
              <header>
                <div>
                  <span>현재 관리 중</span>
                  <strong>{selectedPromotionName} 편성코드명</strong>
                </div>
                <div className="program-name-actions">
                  <button type="button" onClick={() => appendProgramNameRows(10)}>
                    행 추가
                  </button>
                  <button type="button" onClick={clearProgramNames}>
                    비우기
                  </button>
                </div>
              </header>
              <table className="program-name-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>편성코드명</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProgramNames.map((row, rowIndex) => (
                    <tr key={row.id}>
                      <th>{rowIndex + 1}</th>
                      <td>
                        <textarea
                          value={row.value}
                          spellCheck="false"
                          onChange={(event) => updateProgramName(rowIndex, event.target.value)}
                          onPaste={(event) => pasteProgramNames(event, rowIndex)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          <section className="planned-pgm-section">
            <h2>기획PGM</h2>
            <SimpleSettingsTable
              columns={plannedColumns}
              rows={plannedPgmRows}
              onChange={updatePlannedPgmCell}
              onAddRow={addPlannedPgmRow}
              onDeleteRow={deletePlannedPgmRow}
              coachId="planned-pgm"
            />
          </section>
        </div>
      );
    }

    if (sectionId === "settings-special-request") {
      return (
        <SimpleSettingsTable
          columns={specialRequestColumns}
          rows={specialRequestRows}
          onChange={updateSpecialRequestCell}
          onAddRow={addSpecialRequestRow}
          onDeleteRow={deleteSpecialRequestRow}
          coachId="operation-settings-panel"
        />
      );
    }

    if (sectionId === "settings-caption") {
      const bannerOptions = createBannerOptions(bannerRows, { showName: true });
      const columns = captionRequestColumns.map((column) =>
        column.key === "materialId" ? { ...column, options: bannerOptions } : column,
      );

      return (
        <SimpleSettingsTable
          columns={columns}
          rows={captionRequestRows}
          onChange={updateCaptionRequestCell}
          onAddRow={addCaptionRequestRow}
          onDeleteRow={deleteCaptionRequestRow}
          onPaste={pasteCaptionRequests}
          coachId="operation-settings-panel"
        />
      );
    }

    if (sectionId === "settings-banner") {
      const bannerNameOptions = bannerRows
        .filter((row) => row.materialName)
        .map((row) => ({
          value: row.materialName,
          label: row.materialName,
          title: row.materialId,
        }));
      const bannerMaterialOptions = createBannerOptions(bannerRows, { showName: true });
      const scheduleColumns = bannerScheduleColumns.map((column) =>
        column.key === "eventCard"
          ? { ...column, options: bannerNameOptions }
          : column.key === "materialId"
            ? { ...column, options: bannerMaterialOptions }
            : column,
      );

      return (
        <div className="banner-settings-layout">
          <section>
            <h2>행사카드 일정</h2>
            <SimpleSettingsTable
              columns={scheduleColumns}
              rows={bannerScheduleRows}
              onChange={updateBannerScheduleCell}
              onAddRow={addBannerScheduleRow}
              onDeleteRow={deleteBannerScheduleRow}
              coachId="operation-settings-panel"
            />
          </section>
          <section>
            <h2>배너소재 전체 리스트</h2>
            <SimpleSettingsTable
              columns={bannerColumns}
              rows={bannerRows}
              onChange={updateBannerCell}
              onAddRow={addBannerRow}
              onDeleteRow={deleteBannerRow}
              coachId="banner-material-list"
            />
          </section>
        </div>
      );
    }

    return (
      <div className="empty-state" data-coach="operation-settings-panel">
        <strong>{section.emptyTitle}</strong>
        <span>{section.emptyText}</span>
      </div>
    );
  };

  const appendProgramNameRows = (count) => {
    setPromotionRows((current) =>
      current.map((promotion, promotionIndex) => {
        if (promotionIndex !== selectedPromotionIndex) return promotion;
        return {
          ...promotion,
          programNames: [...getPromotionProgramNames(promotion), ...createProgramNameRows(count)],
        };
      }),
    );
  };

  return (
    <div className="output-page">
      <header className="topbar">
        <div>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
        <div className="actions">
          <CoachTour steps={coachSteps} />
        </div>
      </header>

      <section className="settings-workspace">{renderContent()}</section>
    </div>
  );
}

function createPromotionRow() {
  return {
    id: crypto.randomUUID?.() ?? `promotion-${Date.now()}-${Math.random()}`,
    promotionName: "",
    startDate: "",
    endDate: "",
    material1: "",
    material2: "",
    material3: "",
    material4: "",
    note: "",
    programNames: createProgramNameRows(),
  };
}

function createPlannedPgmRow() {
  return {
    id: crypto.randomUUID?.() ?? `planned-pgm-${Date.now()}-${Math.random()}`,
    plannedPgmName: "",
    startDate: "",
    endDate: "",
    material1: "",
    material2: "",
    material3: "",
    material4: "",
    note: "",
  };
}

function createDefaultMaterialRows() {
  return [createDefaultMaterialRow("유형"), createDefaultMaterialRow("무형")];
}

function createDefaultMaterialRow(materialType) {
  return {
    id: `default-materials-${materialType}`,
    materialType,
    material1: materialType === "유형" ? "행사카드" : "미운영",
    material2: "",
    material3: "",
    material4: "",
  };
}

function normalizeDefaultMaterialRows(rows) {
  const currentRows = Array.isArray(rows) ? rows : [];
  const legacyRow = currentRows[0] ?? {};
  const typedRows = ["유형", "무형"].map((materialType) => {
    const matchedRow = currentRows.find((row) => row.materialType === materialType);
    return {
      ...createDefaultMaterialRow(materialType),
      ...(materialType === "유형" ? legacyRow : {}),
      ...matchedRow,
      id: `default-materials-${materialType}`,
      materialType,
      material1: materialType === "유형" ? "행사카드" : "미운영",
    };
  });

  return typedRows;
}

function createDisabledMdRows() {
  return defaultDisabledMdCategories.map((mdCategory) => ({
    id: crypto.randomUUID?.() ?? `disabled-md-${mdCategory}-${Math.random()}`,
    mdCategory,
  }));
}

function createDisabledMdRow() {
  return {
    id: crypto.randomUUID?.() ?? `disabled-md-${Date.now()}-${Math.random()}`,
    mdCategory: "",
  };
}

function createProgramNameRows(count = 30) {
  return Array.from({ length: count }, () => createProgramNameRow());
}

function createProgramNameRow() {
  return {
    id: crypto.randomUUID?.() ?? `program-name-${Date.now()}-${Math.random()}`,
    value: "",
  };
}

function createBannerRows() {
  return defaultBannerRows.map(([materialId, materialName]) => ({
    id: crypto.randomUUID?.() ?? `banner-${materialId}-${Math.random()}`,
    materialId,
    materialName,
    positionType: "",
  }));
}

function createBannerRow() {
  return {
    id: crypto.randomUUID?.() ?? `banner-${Date.now()}-${Math.random()}`,
    materialId: "",
    materialName: "",
    positionType: "",
  };
}

function createBannerScheduleRows() {
  const bannerRows = createBannerRows();

  return defaultBannerScheduleRows.map(([eventCard, startDate, endDate, materialId]) => {
    const banner = bannerRows.find((row) => row.materialId === materialId);

    return {
      id: crypto.randomUUID?.() ?? `banner-schedule-${eventCard}-${startDate}-${Math.random()}`,
      eventCard: banner?.materialName ?? eventCard,
      startDate,
      endDate,
      materialId,
    };
  });
}

function createBannerScheduleRow() {
  return {
    id: crypto.randomUUID?.() ?? `banner-schedule-${Date.now()}-${Math.random()}`,
    eventCard: "",
    startDate: "",
    endDate: "",
    materialId: "",
  };
}

function createBannerOptions(rows, options = {}) {
  return rows
    .filter((row) => row.materialId && row.materialName)
    .map((row) => ({
      value: row.materialId,
      label: options.showName ? `${row.materialName} (${row.materialId})` : row.materialId,
      closedLabel: row.materialId,
      title: row.materialName,
    }));
}

function normalizePriorityOrder(order) {
  const validIds = new Set(priorityItems.map((item) => item.id));
  const currentOrder = Array.isArray(order) ? order : [];
  const cleanedOrder = currentOrder.filter((id, index) => validIds.has(id) && currentOrder.indexOf(id) === index);
  const missingOrder = priorityItems.map((item) => item.id).filter((id) => !cleanedOrder.includes(id));
  return [...cleanedOrder, ...missingOrder];
}

function getPromotionProgramNames(promotion) {
  return promotion.programNames?.length ? promotion.programNames : createProgramNameRows();
}

function createCaptionRequestRows(count = 30) {
  return Array.from({ length: count }, () => createCaptionRequestRow());
}

function createCaptionRequestRow() {
  return {
    id: crypto.randomUUID?.() ?? `caption-request-${Date.now()}-${Math.random()}`,
    scheduleDateTime: "",
    productName: "",
    materialId: "",
    requestContent: "",
    requestDetail: "",
  };
}

function createSpecialRequestRow() {
  return {
    id: crypto.randomUUID?.() ?? `special-request-${Date.now()}-${Math.random()}`,
    pgmDateTime: "",
    programName: "",
    material1: "",
    material2: "",
    material3: "",
    material4: "",
    note: "",
  };
}
