import { push, ref, serverTimestamp, update } from "firebase/database";
import { database } from "./firebase.js";
import { buildArchiveUpdates } from "./scheduleArchive.js";

export async function saveMasterSchedule(entries, sourceSnapshot) {
  const versionId = push(ref(database,"scheduleArchive/saveIds")).key;
  const result = buildArchiveUpdates({entries,sourceSnapshot,versionId,savedAt:serverTimestamp()});
  await update(ref(database),result.updates);
  return result;
}
