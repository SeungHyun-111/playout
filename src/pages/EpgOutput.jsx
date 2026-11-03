import { useRef } from "react";
import DateSelection from "../components/DateSelection.jsx";
import useDateSelection from "../hooks/useDateSelection.js";
import { mailDateRange } from "../lib/mailDateRange.js";
import OutputMailButton from "../components/OutputMailButton.jsx";
import CoachTour from "../components/CoachTour.jsx";

const outputHeaders = ["No", "방송일자", "요일", "방송시간", "MD분류", "아이템명"];

const weekdayMap = {
  월: "월요일",
  화: "화요일",
  수: "수요일",
  목: "목요일",
  금: "금요일",
  토: "토요일",
  일: "일요일",
};

const coachSteps = [
  {
    target: '[data-coach="epg-validate"]',
    title: "채널 검증",
    description: "채널 값이 전체, 1, 2,3,4가 아니면 어떤 행을 선택해야 하는지 알려줍니다.",
  },
  {
    target: '[data-coach="epg-copy"]',
    title: "화면 그대로 복사",
    description: "결과 영역을 직접 드래그한 것처럼 복사해서 Outlook에 표 양식이 유지되게 붙여넣습니다.",
  },
  {
    target: '[data-coach="epg-channel-1"]',
    title: "1채널 결과",
    description: "TimeBlock의 채널 값이 전체 또는 1인 행이 이 표로 들어옵니다.",
  },
  {
    target: '[data-coach="epg-channel-2"]',
    title: "2채널 결과",
    description: "TimeBlock의 채널 값이 전체 또는 2,3,4인 행이 이 표로 들어옵니다.",
  },
];

function findIndex(headers, name) {
  return headers.findIndex((header) => header.trim() === name);
}

function formatDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[2]}/${match[3]}`;
  return text.replaceAll("-", "/").slice(5) || text;
}

function formatTime(value) {
  return String(value ?? "").split("~")[0].trim();
}

function formatWeekday(value) {
  const text = String(value ?? "").trim();
  return weekdayMap[text] ?? text;
}

function normalizeChannel(value) {
  return String(value ?? "").replace(/\s/g, "");
}

function isFilledRow(row) {
  return row.some((value) => String(value ?? "").trim() !== "");
}

function makeRecord(row, indexes) {
  return {
    rawDate: row[indexes.date],
    date: formatDate(row[indexes.date]),
    weekday: formatWeekday(row[indexes.weekday]),
    time: formatTime(row[indexes.time]),
    category: row[indexes.category] || "",
    item: row[indexes.item] || "",
  };
}

function buildEpg(headers, rows) {
  const indexes = {
    date: findIndex(headers, "방송일자"),
    weekday: findIndex(headers, "요일"),
    time: findIndex(headers, "방송시간"),
    channel: findIndex(headers, "채널"),
    category: findIndex(headers, "MD분류"),
    item: findIndex(headers, "편성코드명"),
  };
  const missing = Object.entries(indexes)
    .filter(([, index]) => index < 0)
    .map(([key]) => key);

  if (missing.length > 0) {
    return { channel1: [], channel2: [], ambiguous: [], missing };
  }

  const channel1 = [];
  const channel2 = [];
  const ambiguous = [];

  rows.filter(isFilledRow).forEach((row, rowIndex) => {
    const channel = normalizeChannel(row[indexes.channel]);
    const record = makeRecord(row, indexes);

    if (channel === "전체") {
      channel1.push(record);
      channel2.push(record);
      return;
    }

    if (channel === "1") {
      channel1.push(record);
      return;
    }

    if (channel === "2,3,4") {
      channel2.push(record);
      return;
    }

    ambiguous.push({
      rowNumber: rowIndex + 1,
      channel: row[indexes.channel],
      item: record.item,
    });
  });

  return { channel1, channel2, ambiguous, missing: [] };
}

function OutputTable({ title, rows, coachId }) {
  return (
    <section className="epg-channel" data-coach={coachId}>
      <h2>{title}</h2>
      <table className="epg-table">
        <thead>
          <tr>
            {outputHeaders.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${title}-${index}`}>
              <td>{index + 1}</td>
              <td>{row.date}</td>
              <td>{row.weekday}</td>
              <td>{row.time}</td>
              <td>{row.category}</td>
              <td>{row.item}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function EpgOutput({ headers, rows }) {
  const outputRef = useRef(null);
  const dateIndex = findIndex(headers, "방송일자");
  const selection = useDateSelection(rows.filter(isFilledRow).map(row=>row[dateIndex]), "epg");
  const result = buildEpg(headers, rows.filter(row=>selection.includes(row[dateIndex])));
  const mailDate = mailDateRange([...result.channel1, ...result.channel2].map(row => row.rawDate));

  const showIssues = () => {
    if (result.missing.length > 0) {
      alert(`EPG 생성에 필요한 헤더가 없습니다: ${result.missing.join(", ")}`);
      return false;
    }

    if (result.ambiguous.length > 0) {
      alert(
        [
          "채널 선택이 필요한 행이 있습니다.",
          "",
          ...result.ambiguous.map(
            (item) => `${item.rowNumber}행 / 채널: ${item.channel || "(빈값)"} / ${item.item}`,
          ),
        ].join("\n"),
      );
      return false;
    }

    return true;
  };

  const copyResult = () => {
    if (!showIssues()) return;

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(outputRef.current);
    selection.removeAllRanges();
    selection.addRange(range);

    const copied = document.execCommand("copy");
    selection.removeAllRanges();

    if (!copied) {
      alert("복사에 실패했습니다. 결과 영역을 직접 드래그해서 복사해주세요.");
      return;
    }

    alert("EPG 결과를 클립보드에 복사했습니다.");
  };

  return (
    <div className="output-page">
      <header className="topbar">
        <div>
          <h1>EPG</h1>
          <p>채널 1은 전체/1, 채널 2는 전체/2,3,4 기준으로 생성합니다.</p>
        </div>
        <div className="actions">
          <CoachTour steps={coachSteps} />
          <button data-coach="epg-validate" type="button" onClick={showIssues}>
            검증
          </button>
          <button data-coach="epg-copy" type="button" onClick={copyResult}>
            화면 그대로 복사
          </button>
        </div>
      </header>

      <DateSelection {...selection} />
      <div className="output-mail-toolbar">
          <OutputMailButton outputRef={outputRef} validate={showIssues} hasRows={result.channel1.length + result.channel2.length} kind="epg" date={mailDate} />
      </div>

      <section className="epg-output" ref={outputRef}>
        <div className="epg-message">
          <p>안녕하세요</p>
          <p aria-hidden="true">&nbsp;</p>
          <p>SK스토아 편성팀입니다.</p>
          <p>
            {mailDate} 편성정보 송부드립니다.
          </p>
          <p aria-hidden="true">&nbsp;</p>
        </div>

        <OutputTable title="1채널" rows={result.channel1} coachId="epg-channel-1" />
        <p className="epg-gap" aria-hidden="true">&nbsp;</p>
        <OutputTable title="2채널" rows={result.channel2} coachId="epg-channel-2" />

        <p className="epg-thanks">감사합니다.</p>
      </section>
    </div>
  );
}
