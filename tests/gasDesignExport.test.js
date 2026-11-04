import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('디자인 추출은 빈 10만 행을 조회하지 않고 단계 진행을 출력한다', () => {
  const logs = [], calls = [];
  const grid = value => Array.from({ length: 30 }, () => Array(26).fill(value));
  const range = {
    getDisplayValues: () => grid(''), getA1Notation: () => 'A1:Z30', getMergedRanges: () => [],
  };
  for (const method of ['getBackgrounds', 'getFontColors', 'getFontFamilies', 'getFontWeights', 'getFontStyles', 'getFontLines', 'getHorizontalAlignments', 'getVerticalAlignments', 'getNumberFormats']) range[method] = () => grid('normal');
  range.getFontSizes = () => grid(10);
  range.getWrapStrategies = () => grid('CLIP');
  range.getTextDirections = () => grid(null);
  range.getTextRotations = () => grid({ getDegrees: () => 0, isVertical: () => false });
  const sheet = {
    getName: () => '1103CH1', getMaxRows: () => 100000, getMaxColumns: () => 1000,
    getLastRow: () => 30, getLastColumn: () => 26,
    getRange: (r, c, h, w) => { assert.equal(h, 30); assert.equal(w, 26); return range; },
    getColumnWidth: n => { calls.push(['col', n]); return 80; }, isColumnHiddenByUser: () => false,
    getRowHeight: n => { calls.push(['row', n]); return n === 1 ? 100 : 25; }, isRowHiddenByUser: () => false,
    getFilter: () => null, getConditionalFormatRules: () => [], getFrozenRows: () => 7,
    getFrozenColumns: () => 0, hasHiddenGridlines: () => true, isRightToLeft: () => false, getTabColor: () => null,
  };
  const context = vm.createContext({ console: { log: line => logs.push(line), error: line => logs.push(line) }, SpreadsheetApp: {
    openById: () => { assert.ok(logs.some(line => line.includes('연결 시작'))); return { getSheets: () => [sheet] }; },
  } });
  vm.runInContext(fs.readFileSync(new URL('../gas/Playout1103DesignExport.gs', import.meta.url), 'utf8'), context);
  context.PL1103DESIGN_export();
  assert.equal(calls.filter(([type]) => type === 'row').length, 30);
  assert.equal(calls.filter(([type]) => type === 'col').length, 26);
  assert.ok(logs.some(line => line.includes('getWrapStrategies 시작')));
  assert.ok(logs.some(line => line.includes('행 10/30 완료')));
  assert.ok(logs.some(line => line.includes('추출 성공')));
  assert.equal(logs.at(-1), '=== PL1103DESIGN END ===');
});
