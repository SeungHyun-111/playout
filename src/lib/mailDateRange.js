export function mailDateRange(values) {
  const dates = [...new Set(values.map(value => String(value ?? "").trim()).filter(Boolean))]
    .map(value => {
      const match = value.match(/^(?:(\d{4})[-/])?(\d{1,2})[-/](\d{1,2})/);
      return match ? { year: match[1] || "", month: Number(match[2]), day: Number(match[3]) } : null;
    }).filter(Boolean)
    .sort((a, b) => Number(a.year) - Number(b.year) || a.month - b.month || a.day - b.day);
  if (!dates.length) return "";
  const first = dates[0];
  const last = dates[dates.length - 1];
  const includeYear = first.year !== last.year;
  const label = date => `${includeYear && date.year ? `${date.year}/` : ""}${date.month}/${date.day}`;
  return label(first) === label(last) ? label(first) : `${label(first)}~${label(last)}`;
}
