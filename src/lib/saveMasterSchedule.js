import { get, ref, serverTimestamp, update } from "firebase/database";
import { database } from "./firebase.js";
import { buildArchiveUpdates, replaceArchiveVersions } from "./scheduleArchive.js";

export async function saveMasterSchedule(entries, sourceSnapshot) {
  const versionId = 'current';
  const result = buildArchiveUpdates({entries,sourceSnapshot,versionId,savedAt:serverTimestamp()});
  const previousByDate = Object.fromEntries(await Promise.all(result.dates.map(async date =>
    [date, (await get(ref(database, `scheduleArchive/versions/${date}`))).val() || {}])));
  await update(ref(database),replaceArchiveVersions(result.updates, previousByDate));
  return result;
}
