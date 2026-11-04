import test from 'node:test';
import assert from 'node:assert/strict';
import { gasArchiveEntries, gasChannels, gasSchedules, sendGasSchedule } from '../src/lib/gasSchedule.js';
import fs from 'node:fs';
import vm from 'node:vm';

test('GAS 성공·실패 이유와 로그를 전달하고 통신 오류는 결과 불명으로 처리한다', async t => {
  const url = 'https://script.google.com/macros/s/example/exec';
  const options = { url, mode: 'initial', schedule: { rows: [] } };
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(Object.hasOwn(JSON.parse(init.body), 'token'), false);
    return { ok: true, json: async () => ({ ok: true, logs: ['저장 완료'] }) };
  });
  assert.deepEqual((await sendGasSchedule(options)).logs, ['저장 완료']);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: false, stage: '탭 생성', error: '초기본이 이미 있습니다.', logs: ['실패'] }) });
  await assert.rejects(sendGasSchedule(options), error => error.outcome === 'failed' && error.diagnostics.stage === '탭 생성' && error.message.includes('이미'));
  globalThis.fetch = async () => { throw new Error('network'); };
  await assert.rejects(sendGasSchedule(options), error => error.outcome === 'unknown');
});

test('GAS는 별도 속성 설정 없이 빈 요청의 실패 단계·이유·로그를 반환한다', () => {
  const context = vm.createContext({
    Utilities: { getUuid: () => 'test-request', formatDate: () => '12:00:00' },
    console: { log() {} }, LockService: { getScriptLock: () => ({}) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ value, setMimeType() { return this; } }) },
  });
  vm.runInContext(fs.readFileSync(new URL('../gas/PlayoutSchedule.gs', import.meta.url), 'utf8'), context);
  assert.equal(context.PLAYOUT_SPREADSHEET_ID, '1rkoxPQkJssM-ZH5dkQConbb2tbx6ctZPhZGzq9k6UVU');
  const result = JSON.parse(context.doPost({}).value);
  assert.equal(result.ok, false);
  assert.match(result.error, /POST JSON/);
  assert.equal(result.stage, '요청 확인');
  assert.equal(result.requestId, 'test-request');
  assert.ok(result.logs.some(line => line.includes('실패')));
});

const entry = (channel, date, material) => ({ channel, values: ['99', date, '01:00:00', '', '', '', material] });
test('RTDB 저장 대상은 선택한 날짜·채널과 공통 행만 포함하고 공통 행을 중복 저장하지 않는다', () => {
  const entries = [entry('전체', '2026/11/03', 'common'), entry('1', '2026/11/03', 'one'), entry('2,3,4', '2026/11/03', 'group'), entry('1,2', '2026/11/03', 'other'), entry('전체', '2026/11/04', 'another-day')];
  const schedules = gasSchedules(entries, ['1', '2,3,4']);
  assert.deepEqual(gasArchiveEntries(entries, schedules).map(item => item.values[6]), ['common', 'one', 'group']);
});
test('실제 채널 값을 분해하지 않고 전체 행을 선택한 각 묶음에 포함한다', () => {
  const entries = [entry('전체', '2026/11/03', 'common'), entry('1', '2026/11/03', 'one'), entry('2,3,4', '2026/11/03', 'group'), entry('1,2', '2026/11/03', 'other')];
  assert.deepEqual(gasChannels(entries), ['1', '2,3,4', '1,2']);
  const sheets = gasSchedules(entries, ['2,3,4', '1,2']);
  assert.deepEqual(sheets.map(sheet => sheet.channel), ['2,3,4', '1,2']);
  assert.deepEqual(sheets.map(sheet => sheet.rows.map(row => row[6])), [['common', 'group'], ['common', 'other']]);
  assert.deepEqual(sheets[0].rows.map(row => row[0]), ['1', '2']);
});
test('해당 날짜에 존재하는 채널만 생성하고 중복 선택·이전 목록 값은 제외한다', () => {
  const entries = [entry('전체', '2026/11/03', 'a'), entry('1', '2026/11/03', 'b'), entry('전체', '2026/11/04', 'c'), entry('1,2', '2026/11/04', 'd')];
  const sheets = gasSchedules(entries, ['1', '1', '1,2', 'removed']);
  assert.deepEqual(sheets.map(({ broadcastDate, channel }) => [broadcastDate, channel]), [['2026-11-03', '1'], ['2026-11-04', '1,2']]);
  assert.deepEqual(gasSchedules(entries, []), []);
});
