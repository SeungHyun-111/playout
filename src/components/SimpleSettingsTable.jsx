import { useEffect, useRef, useState } from "react";
import FlexibleDateInput from "./FlexibleDateInput.jsx";
import { parseSpreadsheet } from "../lib/spreadsheetPaste.js";
import { normalizeDateInput, normalizeDateTimeInput } from "../lib/flexibleDate.js";

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
  onInsertRow,
  addRowLabel = "행 추가",
}) {
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);
  const [openSelectKey, setOpenSelectKey] = useState(null);
  const tableWrapRef = useRef(null);
  const deleteTarget = deleteTargetIndex === null ? null : rows[deleteTargetIndex];
  const pasteCells = (event, startRow, startCol) => {
    onPaste?.(event,startRow,startCol);
    if(event.defaultPrevented)return;
    const text=event.clipboardData.getData("text/plain");
    if(!text.includes("\t")&&!text.trim().includes("\n"))return;
    event.preventDefault();
    const incoming=parseSpreadsheet(text);
    const needed=Math.max(0,startRow+incoming.length-rows.length);
    for(let i=0;i<needed;i++)onAddRow?.();
    incoming.forEach((row,r)=>{
      if(startRow+r>=rows.length && !onAddRow)return;
      row.forEach((value,c)=>{
        const column=columns[startCol+c];if(!column||column.readOnly)return;
        const normalized=column.type==="date"?normalizeDateInput(value):column.type==="datetimePicker"?normalizeDateTimeInput(value):value;
        onChange(startRow+r,column.key,normalized??value);
      });
    });
  };

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
                    <FlexibleDateInput label={`${rowIndex + 1}행 ${column.label}`} value={row[column.key] ?? ""}
                      year={column.year} shortDate={column.shortDate}
                      onChange={value => onChange(rowIndex, column.key, value)}
                      onFocus={() => onSelectRow?.(rowIndex)}
                      onPaste={event => pasteCells(event, rowIndex, colIndex)} />
                  ) : column.type === "datetimePicker" ? (
                    <FlexibleDateInput kind="datetime" label={`${rowIndex + 1} ${column.label}`} value={row[column.key] ?? ""}
                      onChange={value => onChange(rowIndex, column.key, value)}
                      onFocus={() => onSelectRow?.(rowIndex)}
                      onPaste={event => pasteCells(event, rowIndex, colIndex)} />
                  ) : column.type === "select" ? (
                    <ComboSelect
                      column={column}
                      isOpen={openSelectKey === `${row.id}-${column.key}`}
                      onChange={(value) => onChange(rowIndex, column.key, value)}
                      onOpenChange={(isOpen) => setOpenSelectKey(isOpen ? `${row.id}-${column.key}` : null)}
                      onPaste={(event) => pasteCells(event, rowIndex, colIndex)}
                      onSelectRow={() => onSelectRow?.(rowIndex)}
                      value={row[column.valueKey || column.key] ?? ""}
                      fallbackLabel={column.displayValue?.(row)}
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
                      onPaste={(event) => pasteCells(event, rowIndex, colIndex)}
                    />
                  )}
                </td>
              ))}
              {!hideManagement && (
                <td>
                  {onInsertRow && <button type="button" aria-label={`${rowIndex + 1}행 아래 일정 추가`} onClick={() => onInsertRow(rowIndex)}>+</button>}
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
          {addRowLabel}
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

function ComboSelect({ column, value, isOpen, onChange, onOpenChange, onSelectRow, onPaste, fallbackLabel }) {
  const selectedOption = column.options?.find((option) => option.value === value);
  const displayValue = selectedOption?.closedLabel || fallbackLabel || value || "선택";

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
