export function applyMasterComments(entries,comments) {
  return entries.map(entry=>({
    ...entry,
    values:entry.values.map((value,index)=>index===24 ? String(comments[entry.commentKey] ?? "") : value),
  }));
}
