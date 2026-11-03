import { useState } from "react";
import CoachTour from "../components/CoachTour.jsx";

const INITIAL_ROWS = 40;

export const timeBlockHeaders = [
  "No",
  "방송일자",
  "요일",
  "방송시간",
  "노출",
  "가중",
  "PGM명",
  "채널",
  "편성코드",
  "편성코드명",
  "MD분류",
  "영상코드",
  "영상명",
  "상품코드",
  "상품명",
  "영상\n맵핑",
  "상태",
  "직매입여부",
  "약정여부",
  "모바일광고비여부",
  "메모1",
  "메모코드명",
  "메모2",
  "메모코드명",
  "MD팀",
  "계약상태",
  "유형",
  "상선위정보 기업구분",
  "신상품구분",
  "PGM배너여부",
  "정액방송수수료",
  "모바일광고비",
  "소재ID",
  "방송시간외 판매불가",
];

const sampleRows = [
  [
    "1",
    "2026-08-04",
    "화",
    "00:31 ~ 01:31",
    "60",
    "8.28",
    "SK스토아 프로그램",
    "1",
    "10010823",
    "[코리아나]녹두마스크팩",
    "뷰티",
    "0000032247",
    "260519_코리아나녹두마스크팩",
    "63251944",
    "[코리아나][방송에서만]코리아나 녹두 수딩 젤리 마스크 50매(체험분 1매 포함)",
  ],
  [
    "2",
    "2026-08-04",
    "화",
    "00:31 ~ 01:31",
    "60",
    "19.32",
    "[믿쓰진]",
    "2,3,4",
    "10007117",
    "[코이]화이트앰플",
    "뷰티",
    "0000032820",
    "260623_(광)[코이][믿쓰진][최대 용량]단백질 앰플(7월부터+치킨)",
    "65588838",
    "[코이]+[믿쓰진][믿쓰진 패키지]단백질 앰플 최대 용량(35ml*6+10ml*2+무체*1+리프트볼*1+미스트 80ml*1)",
  ],
  [
    "3",
    "2026-08-04",
    "화",
    "01:31 ~ 02:11",
    "40",
    "0.4",
    "SK스토아 프로그램",
    "전체",
    "10010832",
    "[지중해품은]곡물도시락",
    "ESG",
    "0000032612",
    "[선거확인][푸드씽크]푸드씽크 지중해품은 통곡물 저당 도시락 13팩",
    "64933756",
    "[푸드씽크]푸드씽크 지중해품은 통곡물 저당 도시락 13팩",
  ],
];

const coachSteps = [
  {
    target: '[data-coach="timeblock-sheet"]',
    title: "TimeBlock 붙여넣기",
    description: "엑셀이나 구글 스프레드시트에서 복사한 범위를 원하는 시작 셀에 붙여넣습니다.",
  },
  {
    target: '[data-coach="timeblock-header"]',
    title: "헤더 편집",
    description: "헤더명은 직접 수정할 수 있고, 헤더를 우클릭하면 좌우 열을 추가할 수 있습니다.",
  },
  {
    target: '[data-coach="timeblock-add-row"]',
    title: "행 추가",
    description: "빈 행이 부족할 때 10개씩 추가합니다. 붙여넣기 범위가 크면 필요한 만큼 자동으로 늘어납니다.",
  },
  {
    target: '[data-coach="timeblock-clear"]',
    title: "비우기",
    description: "현재 입력값을 지우고 기본 헤더만 남깁니다.",
  },
];

export function createBlankRows(rowCount, colCount) {
  return Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ""));
}

export function createInitialTimeBlockGrid(rowCount = INITIAL_ROWS, colCount = timeBlockHeaders.length) {
  const grid = createBlankRows(rowCount, colCount);
  sampleRows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (colIndex < colCount) {
        grid[rowIndex][colIndex] = value;
      }
    });
  });
  return grid;
}

function insertItems(array, index, count, createValue) {
  return [...array.slice(0, index), ...Array.from({ length: count }, createValue), ...array.slice(index)];
}

export default function TimeBlockInput({ headerValues, setHeaderValues, grid, setGrid }) {
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [insertCount, setInsertCount] = useState(1);

  const updateCell = (row, col, value) => {
    setGrid((current) =>
      current.map((rowValues, rowIndex) =>
        rowIndex === row
          ? rowValues.map((cellValue, colIndex) => (colIndex === col ? value : cellValue))
          : rowValues,
      ),
    );
  };

  const ensureRows = (targetRows, colCount = headerValues.length) => {
    setGrid((current) => {
      if (current.length >= targetRows) return current;
      return [...current, ...createBlankRows(targetRows - current.length, colCount)];
    });
  };

  const handlePaste = (event, startRow, startCol) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;

    event.preventDefault();
    const pastedRows = text
      .replace(/\r/g, "")
      .replace(/\n$/, "")
      .split("\n")
      .map((line) => line.split("\t"));
    const neededRows = startRow + pastedRows.length;
    const neededCols = Math.max(headerValues.length, startCol + Math.max(...pastedRows.map((row) => row.length)));
    const nextHeaders = [...headerValues, ...Array.from({ length: neededCols - headerValues.length }, () => "")];
    const nextGrid = grid.map((row) => [...row, ...Array.from({ length: neededCols - row.length }, () => "")]);

    while (nextGrid.length < neededRows) {
      nextGrid.push(Array.from({ length: neededCols }, () => ""));
    }

    pastedRows.forEach((row, rowOffset) => {
      row.forEach((value, colOffset) => {
        nextGrid[startRow + rowOffset][startCol + colOffset] = value;
      });
    });

    setHeaderValues(nextHeaders);
    setGrid(nextGrid);
  };

  const openContextMenu = (event, row, col, target = "cell") => {
    event.preventDefault();
    setSelected({ row, col });
    setContextMenu({ x: event.clientX, y: event.clientY, row, col, target });
  };

  const closeContextMenu = () => setContextMenu(null);

  const insertRows = (position) => {
    const count = Math.max(1, Number(insertCount) || 1);
    const index = position === "above" ? contextMenu.row : contextMenu.row + 1;
    setGrid((current) => insertItems(current, index, count, () => Array.from({ length: headerValues.length }, () => "")));
    closeContextMenu();
  };

  const insertColumns = (position) => {
    const count = Math.max(1, Number(insertCount) || 1);
    const index = position === "left" ? contextMenu.col : contextMenu.col + 1;
    setHeaderValues((current) => insertItems(current, index, count, () => ""));
    setGrid((current) => current.map((row) => insertItems(row, index, count, () => "")));
    closeContextMenu();
  };

  return (
    <div className="timeblock-page" onClick={closeContextMenu}>
      <header className="topbar">
        <div>
          <h1>TimeBlock.입력</h1>
          <p>엑셀이나 구글 스프레드시트에서 복사한 내용을 셀에 바로 붙여넣으세요.</p>
        </div>
        <div className="actions">
          <CoachTour steps={coachSteps} />
          <button data-coach="timeblock-add-row" type="button" onClick={() => ensureRows(grid.length + 10)}>
            행 추가
          </button>
          <button
            data-coach="timeblock-clear"
            type="button"
            onClick={() => {
              setHeaderValues(timeBlockHeaders);
              setGrid(createBlankRows(INITIAL_ROWS, timeBlockHeaders.length));
            }}
          >
            비우기
          </button>
        </div>
      </header>

      <section className="sheet-wrap" data-coach="timeblock-sheet" aria-label="TimeBlock 입력 테이블">
        <table className="sheet">
          <thead>
            <tr>
              <th className="field-corner" />
              {headerValues.map((value, colIndex) => (
                <th className="field-head" data-coach={colIndex === 0 ? "timeblock-header" : undefined} key={`header-${colIndex}`}>
                  <textarea
                    className="cell header-cell"
                    data-col-index={colIndex}
                    value={value}
                    spellCheck="false"
                    onFocus={() => setSelected({ row: -1, col: colIndex })}
                    onContextMenu={(event) => openContextMenu(event, -1, colIndex, "header")}
                    onChange={(event) =>
                      setHeaderValues((current) =>
                        current.map((header, index) => (index === colIndex ? event.target.value : header)),
                      )
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th className="row-head">{rowIndex + 1}</th>
                {row.map((value, colIndex) => {
                  const isSelected = selected.row === rowIndex && selected.col === colIndex;
                  return (
                    <td key={colIndex}>
                      <textarea
                        className={`cell ${isSelected ? "selected" : ""}`}
                        data-col-index={colIndex}
                        value={value}
                        spellCheck="false"
                        onFocus={() => setSelected({ row: rowIndex, col: colIndex })}
                        onContextMenu={(event) => openContextMenu(event, rowIndex, colIndex)}
                        onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                        onPaste={(event) => handlePaste(event, rowIndex, colIndex)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <label>
            추가 개수
            <input
              min="1"
              max="100"
              type="number"
              value={insertCount}
              onChange={(event) => setInsertCount(event.target.value)}
            />
          </label>
          {contextMenu.target === "cell" && (
            <>
              <button type="button" onClick={() => insertRows("above")}>
                위쪽에 행 추가
              </button>
              <button type="button" onClick={() => insertRows("below")}>
                아래쪽에 행 추가
              </button>
            </>
          )}
          <button type="button" onClick={() => insertColumns("left")}>
            왼쪽에 열 추가
          </button>
          <button type="button" onClick={() => insertColumns("right")}>
            오른쪽에 열 추가
          </button>
        </div>
      )}
    </div>
  );
}
