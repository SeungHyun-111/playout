import { useState } from "react";
import { dateKey } from "../lib/scheduleFlow.js";

export default function useDateSelection(values, page) {
  const [selected, setSelectedState] = useState(() => {
    try { const stored = JSON.parse(sessionStorage.getItem(`playout.dates.${page}`)); return Array.isArray(stored) ? stored : null; } catch { return null; }
  });
  const setSelected = next => {
    setSelectedState(next);
    try { sessionStorage.setItem(`playout.dates.${page}`, JSON.stringify(next)); } catch { /* Optional browser storage. */ }
  };
  const dates = [...new Set(values.map(dateKey))].sort((a,b)=>a.localeCompare(b));
  const includes = value => selected === null || selected.includes(dateKey(value));
  return { dates, selected, setSelected, includes };
}
