import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../gas/PlayoutSchedule.gs', import.meta.url), 'utf8');
test('탭 이름은 MMDDCH와 원본 채널 묶음을 사용한다', () => {
  const context = vm.createContext({}); vm.runInContext(source, context);
  for (const value of ['1', 'CH1', '채널1']) assert.equal(context.playoutSheetName_('2026-11-06', value), '1106CH1');
  assert.equal(context.playoutSheetName_('2026-11-06', '2,3,4'), '1106CH2,3,4');
});

test('숨김 P/Q를 제거하고 배너9열과 코멘트를 25열 양식에 맞게 입력한다', () => {
  const calls = [], writes = new Map();
  // 사용자 제공 1103CH1 추출값. 복제된 원본의 열 너비입니다.
  const widths = [26,126,81,82,82,81,147,98,81,95,67,167,602,94,94,348,65,93,61,100,68,99,68,105,68,161];
  const sheet = {
    deleteColumns: (start, count) => { calls.push(['delete', start, count]); widths.splice(start - 1, count); },
    getMaxColumns: () => widths.length, insertColumnsAfter: (start, count) => widths.splice(start, 0, ...Array(count).fill(100)),
    getMaxRows: () => 999, getFilter: () => null, getRowHeight: () => 55,
    setRowHeightsForced: (...args) => calls.push(['heights', ...args]),
    setColumnWidth: (col, width) => { widths[col - 1] = width; },
    setFrozenRows() {}, setFrozenColumns() {}, setHiddenGridlines() {},
    getRange: (...address) => {
      const range = new Proxy({}, { get: (_target, method) => (...args) => {
        calls.push([method, address, args]);
        if (method === 'setValues' || method === 'setValue') writes.set(address.join(','), args[0]);
        return range;
      } });
      return range;
    },
  };
  const context = vm.createContext({ SpreadsheetApp: { BorderStyle: { SOLID: 'solid' } } });
  vm.runInContext(source, context);
  const row = Array.from({ length: 25 }, (_, index) => `value-${index}`);
  context.playoutFillTemplate_(sheet, [row], '2,3,4', () => {});
  assert.deepEqual(calls[0], ['delete', 16, 2]);
  assert.deepEqual(widths.slice(15,24), [93,61,100,68,99,68,105,68,161]);
  assert.equal(widths[24], 240);
  assert.equal(writes.get('7,1,1,25')[0][15], '배너소재');
  assert.equal(writes.get('7,1,1,25')[0][24], '편성팀 코멘트');
  assert.deepEqual(writes.get('8,1,1,25')[0], row);
  assert.equal(writes.get('A6'), 'CH2,3,4');
  assert.equal(writes.get('L1'), '특이사항');
  assert.ok(calls.some(([method, address]) => method === 'clearContent' && address[0] === 'M1'));
  assert.ok(calls.some(call => call[0] === 'heights' && call[3] === 55));
  assert.ok(calls.some(([method]) => method === 'copyFormatToRange'));
});
