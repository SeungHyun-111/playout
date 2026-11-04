import { dateKey } from './scheduleFlow.js';

const channelValue = value => String(value ?? '').trim();
export const isCommonChannel = value => channelValue(value).replace(/\s/g, '') === '전체';

// 채널 묶음은 분해하지 않습니다. 원본에 생성된 값을 그대로 선택합니다.
export function gasChannels(entries) {
  return [...new Set(entries.map(entry => channelValue(entry.channel)).filter(value => value && !isCommonChannel(value)))];
}

export function gasSchedules(entries, selectedChannels) {
  const available = gasChannels(entries);
  const channels = [...new Set(selectedChannels)].filter(channel => available.includes(channel));
  const dates = [...new Set(entries.map(entry => dateKey(entry.values[1])).filter(Boolean))].sort();
  return dates.flatMap(broadcastDate => channels.flatMap(channel => {
    const day = entries.filter(entry => dateKey(entry.values[1]) === broadcastDate);
    // 해당 날짜에 없는 채널은 공통 행만으로 탭을 만들지 않습니다.
    if (!day.some(entry => channelValue(entry.channel) === channel)) return [];
    const rows = day.filter(entry => isCommonChannel(entry.channel) || channelValue(entry.channel) === channel)
      .map((entry, index) => entry.values.map((value, col) => col === 0 ? String(index + 1) : value));
    return [{ broadcastDate, channel, rows }];
  }));
}

export function gasArchiveEntries(entries, schedules) {
  return entries.filter(entry => schedules.some(schedule =>
    dateKey(entry.values[1]) === schedule.broadcastDate &&
    (isCommonChannel(entry.channel) || channelValue(entry.channel) === schedule.channel)));
}

export async function sendGasSchedule({ url, mode, schedule }) {
  const endpoint = new URL(url);
  if (endpoint.origin !== 'https://script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname)) {
    throw new Error('GAS 웹 앱의 /exec 배포 URL을 입력해주세요.');
  }
  let response;
  try { response = await fetch(endpoint.href, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...schedule, mode }),
    signal: AbortSignal.timeout(120000),
  }); } catch (cause) {
    throw Object.assign(new Error('GAS 응답을 받지 못했습니다. 통신·브라우저 접근 또는 시간 초과 문제입니다. 구글 시트에서 생성 여부를 확인해주세요.'), { outcome: 'unknown' });
  }
  if (!response.ok) throw Object.assign(new Error(`GAS 응답 HTTP ${response.status}. 구글 시트에서 생성 여부를 확인해주세요.`), { outcome: 'unknown' });
  let result;
  try { result = await response.json(); } catch {
    throw Object.assign(new Error('GAS가 JSON 결과를 반환하지 않았습니다. 웹 앱 배포·접근 설정을 확인해주세요.'), { outcome: 'unknown' });
  }
  if (!result || typeof result.ok !== 'boolean') throw Object.assign(new Error('GAS 응답 형식이 올바르지 않습니다.'), { outcome: 'unknown' });
  if (!result.ok) throw Object.assign(new Error(result.error || 'GAS 저장 실패'), { outcome: 'failed', diagnostics: result });
  return result;
}
