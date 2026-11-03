import { useRef } from "react";
import DateSelection from "../components/DateSelection.jsx";
import useDateSelection from "../hooks/useDateSelection.js";
import { mailDateRange } from "../lib/mailDateRange.js";
import OutputMailButton from "../components/OutputMailButton.jsx";
import CoachTour from "../components/CoachTour.jsx";

const outputHeaders = [
  "방송일자",
  "방송시간",
  "채널",
  "채널명",
  "MD분류",
  "소재ID",
  "영상코드",
  "영상명",
  "상품코드",
  "상품명",
];

const coachSteps = [
  {
    target: '[data-coach="dawon-validate"]',
    title: "필수 헤더 검증",
    description: "다원방송 송출 일정 생성에 필요한 입력 헤더가 빠졌는지 확인합니다.",
  },
  {
    target: '[data-coach="dawon-copy"]',
    title: "화면 그대로 복사",
    description: "결과 표를 화면에서 스크랩한 것처럼 복사해서 Outlook 표 양식을 유지합니다.",
  },
  {
    target: '[data-coach="dawon-table"]',
    title: "송출 일정 표",
    description: "채널 값이 전체가 아닌 행만 표시합니다. 채널 1은 CA, 그 외 채널 묶음은 IP로 표시합니다.",
  },
  {
    target: '[data-coach="dawon-material"]',
    title: "소재ID",
    description: "입력에 소재ID 또는 소재 ID 헤더가 있으면 자동 반영하고, 없으면 빈칸으로 둡니다.",
  },
];

function findIndex(headers, names) {
  const targets = Array.isArray(names) ? names : [names];
  return headers.findIndex((header) => targets.includes(header.trim()));
}

function isFilledRow(row) {
  return row.some((value) => String(value ?? "").trim() !== "");
}

function normalizeChannel(value) {
  return String(value ?? "").replace(/\s/g, "");
}

function formatMailDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[2]}/${match[3]}`;
  return text.replaceAll("-", "/").slice(5) || text;
}

function formatTime(value) {
  return String(value ?? "").split("~")[0].trim();
}

function channelName(channel) {
  return normalizeChannel(channel) === "1" ? "CA" : "IP";
}

function buildDawon(headers, rows) {
  const indexes = {
    date: findIndex(headers, "방송일자"),
    time: findIndex(headers, "방송시간"),
    channel: findIndex(headers, "채널"),
    category: findIndex(headers, "MD분류"),
    materialId: findIndex(headers, ["소재ID", "소재 ID"]),
    videoCode: findIndex(headers, "영상코드"),
    videoName: findIndex(headers, "영상명"),
    productCode: findIndex(headers, "상품코드"),
    productName: findIndex(headers, "상품명"),
  };
  const required = ["date", "time", "channel", "category", "videoCode", "videoName", "productCode", "productName"];
  const missing = required.filter((key) => indexes[key] < 0);

  if (missing.length > 0) {
    return { records: [], missing };
  }

  const records = rows
    .filter(isFilledRow)
    .filter((row) => normalizeChannel(row[indexes.channel]) !== "전체")
    .map((row) => ({
      date: row[indexes.date] || "",
      mailDate: formatMailDate(row[indexes.date]),
      time: formatTime(row[indexes.time]),
      channel: row[indexes.channel] || "",
      channelName: channelName(row[indexes.channel]),
      category: row[indexes.category] || "",
      materialId: indexes.materialId >= 0 ? row[indexes.materialId] || "" : "",
      videoCode: row[indexes.videoCode] || "",
      videoName: row[indexes.videoName] || "",
      productCode: row[indexes.productCode] || "",
      productName: row[indexes.productName] || "",
    }));

  return { records, missing: [] };
}

function getDateRowSpan(records, index) {
  if (index > 0 && records[index - 1].date === records[index].date) return 0;
  let count = 1;
  while (records[index + count]?.date === records[index].date) count += 1;
  return count;
}

function getTimeRowSpan(records, index) {
  if (
    index > 0 &&
    records[index - 1].date === records[index].date &&
    records[index - 1].time === records[index].time
  ) {
    return 0;
  }

  let count = 1;
  while (records[index + count]?.date === records[index].date && records[index + count]?.time === records[index].time) {
    count += 1;
  }
  return count;
}

export default function DawonScheduleOutput({ headers, rows }) {
  const outputRef = useRef(null);
  const dateIndex = findIndex(headers, "방송일자");
  const selection = useDateSelection(rows.filter(isFilledRow).map(row=>row[dateIndex]), "dawon");
  const result = buildDawon(headers, rows.filter(row=>selection.includes(row[dateIndex])));
  const mailDate = mailDateRange(result.records.map(row => row.date));

  const showIssues = () => {
    if (result.missing.length > 0) {
      alert(`다원방송 송출 일정 생성에 필요한 헤더가 없습니다: ${result.missing.join(", ")}`);
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

    alert("다원방송 송출 일정을 클립보드에 복사했습니다.");
  };

  return (
    <div className="output-page">
      <header className="topbar">
        <div>
          <h1>다원방송송출일정</h1>
          <p>채널이 전체가 아닌 TimeBlock 행만 송출 일정으로 생성합니다.</p>
        </div>
        <div className="actions">
          <CoachTour steps={coachSteps} />
          <button data-coach="dawon-validate" type="button" onClick={showIssues}>
            검증
          </button>
          <button data-coach="dawon-copy" type="button" onClick={copyResult}>
            화면 그대로 복사
          </button>
        </div>
      </header>

      <DateSelection {...selection} />
      <div className="output-mail-toolbar">
          <OutputMailButton outputRef={outputRef} validate={showIssues} hasRows={result.records.length} kind="dawon" date={mailDate} />
      </div>

      <section className="dawon-output" ref={outputRef}>
        <div className="dawon-message">
          <p>안녕하세요.</p>
          <p aria-hidden="true">&nbsp;</p>
          <p>편성팀입니다</p>
          <p>{mailDate} 다원방송 송출 일정 공유드립니다.</p>
          <p aria-hidden="true">&nbsp;</p>
        </div>

        <table className="dawon-table" data-coach="dawon-table">
          <thead>
            <tr>
              {outputHeaders.map((header) => (
                <th key={header} data-coach={header === "소재ID" ? "dawon-material" : undefined}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.records.map((row, index) => {
              const dateRowSpan = getDateRowSpan(result.records, index);
              const timeRowSpan = getTimeRowSpan(result.records, index);

              return (
                <tr key={`${row.date}-${row.time}-${row.channel}-${index}`}>
                  {dateRowSpan > 0 && <td rowSpan={dateRowSpan}>{row.date}</td>}
                  {timeRowSpan > 0 && <td rowSpan={timeRowSpan}>{row.time}</td>}
                  <td>{row.channel}</td>
                  <td>{row.channelName}</td>
                  <td>{row.category}</td>
                  <td>{row.materialId}</td>
                  <td>{row.videoCode}</td>
                  <td>{row.videoName}</td>
                  <td>{row.productCode}</td>
                  <td>{row.productName}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="dawon-thanks">감사합니다.</p>
      </section>
    </div>
  );
}
