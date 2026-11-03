import { useEffect, useRef, useState } from "react";

export default function SimpleSettingsTable({
  columns,
  rows,
  onChange,
  onAddRow,
  onDeleteRow,
  coachId,
  selectedRowIndex,
  onSelectRow,
  onPaste,
  hideManagement = false,
}) {
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);
  const [openSelectKey, setOpenSelectKey] = useState(null);
  const tableWrapRef = useRef(null);
  const deleteTarget = deleteTargetIndex === null ? null : rows[deleteTargetIndex];

  useEffect(() => {
    const closeSelect = (event) => {
      if (!tableWrapRef.current?.contains(event.target)) {
        setOpenSelectKey(null);
      }
    };

    document.addEventListener("mousedown", closeSelect);
    return () => document.removeEventListener("mousedown", closeSelect);
  }, []);

  const confirmDelete = () => {
    onDeleteRow(deleteTargetIndex);
    setDeleteTargetIndex(null);
  };

  return (
    <section className="settings-table-wrap" data-coach={coachId} ref={tableWrapRef}>
      <table className="settings-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th data-coach={column.coachId} key={column.key} style={{ width: column.width }}>
                {column.label}
              </th>
            ))}
            {!hideManagement && <th>관리</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className={selectedRowIndex === rowIndex ? "selected-settings-row" : ""} key={row.id}>
              {columns.map((column, colIndex) => (
                <td key={column.key} style={{ width: column.width }}>
                  {column.type === "date" ? (
                    <input
                      type="date"
                      placeholder={column.placeholder}
                      value={row[column.key] ?? ""}
                      onChange={(event) =>
                        onChange(
                          rowIndex,
                          column.key,
                          applyInputMask(event.target.value, column.mask, row[column.key] ?? ""),
                        )
                      }
                      onFocus={() => onSelectRow?.(rowIndex)}
                      onPaste={(event) => onPaste?.(event, rowIndex, colIndex)}
                    />
                  ) : column.type === "datetimePicker" ? (
                    <DateTimePickerInput
                      value={row[column.key] ?? ""}
                      onChange={(value) => onChange(rowIndex, column.key, value)}
                      onFocus={() => onSelectRow?.(rowIndex)}
                    />
                  ) : column.type === "select" ? (
                    <ComboSelect
                      column={column}
                      isOpen={openSelectKey === `${row.id}-${column.key}`}
                      onChange={(value) => onChange(rowIndex, column.key, value)}
                      onOpenChange={(isOpen) => setOpenSelectKey(isOpen ? `${row.id}-${column.key}` : null)}
                      onPaste={(event) => onPaste?.(event, rowIndex, colIndex)}
                      onSelectRow={() => onSelectRow?.(rowIndex)}
                      value={row[column.key] ?? ""}
                    />
                  ) : (
                    <textarea
                      readOnly={column.readOnly}
                      className={column.readOnly ? "readonly-cell" : ""}
                      value={row[column.key] ?? ""}
                      placeholder={column.placeholder}
                      maxLength={column.maxLength}
                      spellCheck="false"
                      onChange={(event) =>
                        onChange(
                          rowIndex,
                          column.key,
                          applyInputMask(event.target.value, column.mask, row[column.key] ?? ""),
                        )
                      }
                      onFocus={() => onSelectRow?.(rowIndex)}
                      onPaste={(event) => onPaste?.(event, rowIndex, colIndex)}
                    />
                  )}
                </td>
              ))}
              {!hideManagement && (
                <td>
                  <button type="button" onClick={() => setDeleteTargetIndex(rowIndex)}>
                    삭제
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!hideManagement && (
        <button className="settings-add-button" type="button" onClick={onAddRow}>
          행 추가
        </button>
      )}

      {!hideManagement && deleteTarget && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="삭제 확인">
          <div className="modal-backdrop" onClick={() => setDeleteTargetIndex(null)} />
          <div className="confirm-modal">
            <strong>행을 삭제할까요?</strong>
            <p>
              {deleteTarget.promotionName ||
                deleteTarget.programName ||
                deleteTarget.pgmDateTime ||
                deleteTarget.materialName ||
                deleteTarget.materialId ||
                "선택한"}{" "}
              데이터가 삭제됩니다.
            </p>
            <div className="modal-actions">
              <button type="button" onClick={() => setDeleteTargetIndex(null)}>
                취소
              </button>
              <button className="danger-button" type="button" onClick={confirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ComboSelect({ column, value, isOpen, onChange, onOpenChange, onSelectRow, onPaste }) {
  const selectedOption = column.options?.find((option) => option.value === value);
  const displayValue = selectedOption?.closedLabel || value || "선택";

  return (
    <div className="combo-cell">
      <button
        className={`combo-select ${value ? "" : "placeholder"}`}
        type="button"
        title={selectedOption?.title ?? ""}
        onClick={() => {
          onSelectRow?.();
          onOpenChange(!isOpen);
        }}
        onPaste={onPaste}
      >
        <span>{displayValue}</span>
      </button>

      {isOpen && (
        <div className="combo-menu">
          <button
            className="combo-option placeholder"
            type="button"
            onClick={() => {
              onChange("");
              onOpenChange(false);
            }}
          >
            선택
          </button>
          {(column.options ?? []).map((option, optionIndex) => (
            <button
              className="combo-option"
              type="button"
              key={`${option.value}-${optionIndex}`}
              title={option.title ?? ""}
              onClick={() => {
                onChange(option.value);
                onOpenChange(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateTimePickerInput({ value, onChange, onFocus }) {
  const { date, time } = splitDateTimePickerValue(value);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [hour, minute] = time ? time.split(":") : ["", ""];

  const updateTime = (nextHour, nextMinute) => {
    onChange(formatDateTimePickerValue(date, `${nextHour}:${nextMinute}`));
    if (nextHour && nextMinute) setIsTimeOpen(false);
  };

  return (
    <div className="datetime-picker" onFocus={onFocus}>
      <input
        aria-label="날짜"
        type="date"
        value={date}
        onChange={(event) => onChange(formatDateTimePickerValue(event.target.value, time))}
      />
      <div className="time-picker-cell">
        <button
          aria-label="시간 선택"
          className={`time-picker-button ${time ? "" : "placeholder"}`}
          type="button"
          onClick={() => setIsTimeOpen((current) => !current)}
        >
          {time || "HH:mm"}
        </button>
        {isTimeOpen && (
          <div className="time-picker-popover">
            <div>
              <strong>시</strong>
              <div className="time-picker-list">
                {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")).map((item) => (
                  <button
                    className={hour === item ? "active" : ""}
                    type="button"
                    key={item}
                    onClick={() => updateTime(item, minute || "00")}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <strong>분</strong>
              <div className="time-picker-list">
                {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((item) => (
                  <button
                    className={minute === item ? "active" : ""}
                    type="button"
                    key={item}
                    onClick={() => updateTime(hour || "00", item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function splitDateTimePickerValue(value) {
  const [date = "", time = ""] = String(value ?? "").split(" ");
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    time: /^\d{2}:\d{2}$/.test(time) ? time : "",
  };
}

function formatDateTimePickerValue(date, time) {
  if (!date && !time) return "";
  return `${date} ${time}`.trim();
}

function applyInputMask(value, mask, previousValue) {
  if (mask !== "datetime-minute") return value;
  return isPartialDateTimeMinute(value) ? value : previousValue;
}

function isPartialDateTimeMinute(value) {
  if (value.length > 16) return false;

  return [...value].every((char, index) => {
    if ([4, 7].includes(index)) return char === "-";
    if (index === 10) return char === " ";
    if (index === 13) return char === ":";
    return /\d/.test(char);
  });
}
