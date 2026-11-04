import { dateKey, timeKey, MASTER_HEADERS } from "./scheduleFlow.js";

// Exact, reversible UTF-8 encoding avoids forbidden RTDB key characters.
export const searchKey = value => "k" + Array.from(new TextEncoder().encode(String(value)), byte => byte.toString(16).padStart(2, "0")).join("");
const text = value => String(value ?? "").trim();
const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(timeKey(value));
const validDate = value => {
  const date = dateKey(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
};

// 날짜별 저장본 하나만 유지합니다. 기존 버전의 검색 인덱스도 함께 교체합니다.
export function replaceArchiveVersions(updates, previousByDate) {
  const next = {};
  Object.entries(updates).forEach(([path, value]) => {
    if (/^scheduleArchive\/(materialUsage|programUsage)\//.test(path)) {
      const parts = path.split('/');
      const id = parts.pop();
      (next[parts.join('/')] ||= {})[id] = value;
    } else next[path] = value;
  });
  const cleanup = {};
  Object.entries(previousByDate).forEach(([date, versions]) => {
    Object.entries(versions || {}).forEach(([versionId, version]) => {
      cleanup[`scheduleArchive/versions/${date}/${versionId}`] = null;
      cleanup[`scheduleArchive/versionHistory/${date}/${versionId}`] = null;
      Object.values(version.events || {}).forEach(event => {
        Object.values(event.materials || {}).forEach(material => {
          if (material.materialId) cleanup[`scheduleArchive/materialUsage/${searchKey(material.materialId)}/${date}/${versionId}`] = null;
        });
        [event.programCode, event.scheduleCode].filter(Boolean).forEach(code => {
          cleanup[`scheduleArchive/programUsage/${searchKey(code)}/${date}/${versionId}`] = null;
        });
      });
    });
  });
  return { ...cleanup, ...next };
}

export function buildArchiveUpdates({ entries, versionId, savedAt, sourceSnapshot }) {
  if (!entries.length) throw new Error("저장할 운행표가 없습니다.");
  const updates = {}, days = {};
  entries.forEach((entry, index) => {
    const row = entry.values;
    if (!validDate(row[1])) throw new Error(`${index + 1}행의 방송일자를 확인해주세요.`);
    if (!validTime(row[2]) || !validTime(row[5])) throw new Error(`${index + 1}행의 시작·종료시간을 확인해주세요.`);
    const date = dateKey(row[1]);
    const eventId = `e${String(index + 1).padStart(6, "0")}`;
    const materials = [
      { role: entry.kind === "advertisement" ? "advertisement" : "main", materialId: text(row[6]) },
      ...[15,17,19,21,23].map((col,i)=>({role:`banner${i+1}`,materialId:text(row[col]),duration:col===23 ? "" : text(row[col+1])})),
    ].filter(material=>material.materialId);
    const event = {
      eventId, sourceId: entry.sourceId || "", commentKey:entry.commentKey || "", broadcastDate: date,
      kind: entry.kind, channel: entry.kind === "advertisement" ? "" : text(entry.channel),
      scheduledStartTime: timeKey(row[2]), scheduledEndTime: timeKey(row[5]),
      programCode:text(row[8]),programName:text(row[9]),scheduleCode:text(row[10]),
      scheduleName:text(row[11]),videoName:text(row[12]),categoryName:text(row[13]),mdCategory:text(row[14]),
      programDurationMinutes:text(row[3]),adDurationSeconds:text(row[4]),
      dawonBroadcast:text(row[7]),programmingComment:String(row[24] ?? ""),materials,status:"scheduled",rawValues:row,
    };
    const day = days[date] ||= {events:{},eventCount:0,materialUsageCount:0};
    day.events[eventId] = event;
    day.eventCount++;
    materials.forEach((material, slot)=>{
      const usageId = `${eventId}_${slot}`;
      updates[`scheduleArchive/materialUsage/${searchKey(material.materialId)}/${date}/${versionId}/${usageId}`] = {
        eventId,versionId,broadcastDate:date,materialId:material.materialId,role:material.role,
        programName:event.programName,scheduleName:event.scheduleName,channel:event.channel,
        scheduledStartTime:event.scheduledStartTime,status:"scheduled",
      };
      day.materialUsageCount++;
    });
    [event.programCode,event.scheduleCode].filter(Boolean).forEach(code=>{
      updates[`scheduleArchive/programUsage/${searchKey(code)}/${date}/${versionId}/${eventId}`] = {
        eventId,versionId,broadcastDate:date,programName:event.programName,
        scheduledStartTime:event.scheduledStartTime,
      };
    });
  });
  Object.entries(days).forEach(([date,day])=>{
    const summary = {versionId,broadcastDate:date,savedAt,eventCount:day.eventCount,materialUsageCount:day.materialUsageCount,schemaVersion:1,status:"scheduled",timezone:"Asia/Seoul"};
    updates[`scheduleArchive/versions/${date}/${versionId}`] = {...summary,headers:MASTER_HEADERS,events:day.events,sourceSnapshot};
    updates[`scheduleArchive/dates/${date}`] = summary;
    updates[`scheduleArchive/versionHistory/${date}/${versionId}`] = summary;
  });
  return {updates,dates:Object.keys(days).sort(),eventCount:entries.length};
}
