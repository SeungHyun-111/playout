// Spreadsheet clipboard cells may contain quoted tabs and line breaks.
export function parseSpreadsheet(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && (quoted || cell === "")) {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === "\t" || char === "\n" || char === "\r")) {
      row.push(cell); cell = "";
      if (char !== "\t") {
        rows.push(row); row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else cell += char;
  }
  row.push(cell);
  if (row.some(value => value !== "") || row.length > 1) rows.push(row);
  return rows;
}

