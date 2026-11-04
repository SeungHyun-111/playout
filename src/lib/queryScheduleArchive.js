import { get, ref, query, orderByKey, startAt, endAt } from "firebase/database";
import { database } from "./firebase.js";
import { searchKey } from "./scheduleArchive.js";

// Dates are YYYY-MM-DD. The key ordering supports date ranges without .indexOn.
const readRange = async (path,from,to) => (await get(query(ref(database,path),orderByKey(),startAt(from),endAt(to)))).val() || {};

export async function listSavedScheduleDates(from,to) {
  return Object.values(await readRange("scheduleArchive/dates",from,to));
}

export async function loadSavedSchedule(date,versionId) {
  let version = versionId;
  if (!version) version = (await get(ref(database,`scheduleArchive/dates/${date}`))).val()?.versionId;
  return version ? (await get(ref(database,`scheduleArchive/versions/${date}/${version}`))).val() : null;
}

export async function findMaterialSchedules(materialId,from,to) {
  const [usage,dates] = await Promise.all([
    readRange(`scheduleArchive/materialUsage/${searchKey(materialId)}`,from,to),
    readRange("scheduleArchive/dates",from,to),
  ]);
  // Old versions stay available for auditing, but must not appear as current usage.
  return Object.entries(usage).flatMap(([date,versions])=>Object.values(versions[dates[date]?.versionId] || {}))
    .sort((a,b)=>a.broadcastDate.localeCompare(b.broadcastDate) || a.scheduledStartTime.localeCompare(b.scheduledStartTime));
}
