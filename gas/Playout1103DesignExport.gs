/**
 * 실행 함수: PL1103DESIGN_export
 * SpreadsheetApp만 사용합니다. Sheets API 활성화·Drive 파일·웹 앱 배포 불필요.
 * 실행 로그의 BEGIN~END 사이 내용을 복사하세요.
 * 각 ROW의 cells에는 [값, 서식ID]가 들어갑니다. STYLES에서 서식ID를 확인합니다.
 * 셀 서식·치수는 내용이 있는 마지막 행/열까지(최소 8행·26열).
 * 테두리와 조건부서식의 원시 색상 조건 일부는 기본 GAS 조회 API가 없어 제외.
 */
function PL1103DESIGN_export() {
  var pl1103Started = Date.now();
  var pl1103Stage = '시작';
  function pl1103Progress(pl1103Message) {
    console.log('[진행 ' + ((Date.now() - pl1103Started) / 1000).toFixed(1) + '초] ' + pl1103Message);
  }
  function pl1103CheckTime() {
    if (Date.now() - pl1103Started > 240000) throw new Error('4분을 초과하여 중단했습니다. 마지막 단계: ' + pl1103Stage + '. END가 없으므로 추출 미완료입니다.');
  }
  console.log('=== PL1103DESIGN BEGIN ===');
  pl1103Progress('1/6 원본 스프레드시트 연결 시작');
  try {
    var pl1103Book = SpreadsheetApp.openById('1rkoxPQkJssM-ZH5dkQConbb2tbx6ctZPhZGzq9k6UVU');
    var pl1103Sheet = pl1103Book.getSheets().filter(function (pl1103Candidate) {
      return pl1103Candidate.getName().trim().toUpperCase() === '1103CH1';
    })[0];
    if (!pl1103Sheet) throw new Error('1103CH1 탭이 없습니다.');
    var pl1103MaxRows = pl1103Sheet.getMaxRows();
    var pl1103MaxCols = pl1103Sheet.getMaxColumns();
    var pl1103Height = Math.min(pl1103MaxRows, Math.max(8, pl1103Sheet.getLastRow()));
    var pl1103Width = Math.min(pl1103MaxCols, Math.max(26, pl1103Sheet.getLastColumn()));
    pl1103Progress('1/6 연결 완료. 추출 ' + pl1103Height + '행 × ' + pl1103Width + '열 / 전체 격자 ' + pl1103MaxRows + '행 × ' + pl1103MaxCols + '열. 범위 밖 빈 행·열은 조회하지 않습니다.');
    var pl1103Range = pl1103Sheet.getRange(1, 1, pl1103Height, pl1103Width);
    pl1103Stage = '표시값 읽기';
    pl1103Progress('2/6 ' + pl1103Stage + ' 시작');
    var pl1103Values = pl1103Range.getDisplayValues();
    pl1103Progress('2/6 표시값 읽기 완료');
    var pl1103Formats = {};
    var pl1103Getters = { background: 'getBackgrounds', fontColor: 'getFontColors', fontFamily: 'getFontFamilies',
      fontSize: 'getFontSizes', fontWeight: 'getFontWeights', fontStyle: 'getFontStyles', fontLine: 'getFontLines',
      horizontalAlignment: 'getHorizontalAlignments', verticalAlignment: 'getVerticalAlignments', numberFormat: 'getNumberFormats',
      wrapStrategy: 'getWrapStrategies', textDirection: 'getTextDirections', textRotation: 'getTextRotations' };
    Object.keys(pl1103Getters).forEach(function (pl1103Key, pl1103Index) {
      pl1103Stage = pl1103Getters[pl1103Key];
      pl1103CheckTime();
      pl1103Progress('3/6 서식 ' + (pl1103Index + 1) + '/13 ' + pl1103Stage + ' 시작');
      pl1103Formats[pl1103Key] = pl1103Range[pl1103Getters[pl1103Key]]();
      pl1103Progress('3/6 ' + pl1103Stage + ' 완료');
    });
    pl1103Stage = '셀 서식 정리';
    pl1103Progress('3/6 셀 서식 정리 시작');
    var pl1103Styles = [];
    var pl1103StyleIds = {};
    var pl1103Rows = [];
    for (var pl1103R = 0; pl1103R < pl1103Height; pl1103R++) {
      var pl1103Cells = [];
      for (var pl1103C = 0; pl1103C < pl1103Width; pl1103C++) {
        var pl1103Style = {};
        Object.keys(pl1103Formats).forEach(function (pl1103Key) {
          var pl1103Value = pl1103Formats[pl1103Key][pl1103R][pl1103C];
          if (pl1103Key === 'textRotation') pl1103Value = pl1103Value ? { degrees: pl1103Value.getDegrees(), vertical: pl1103Value.isVertical() } : null;
          if (pl1103Key === 'wrapStrategy' || pl1103Key === 'textDirection') pl1103Value = pl1103Value == null ? null : String(pl1103Value);
          pl1103Style[pl1103Key] = pl1103Value;
        });
        var pl1103StyleJson = JSON.stringify(pl1103Style);
        if (!Object.prototype.hasOwnProperty.call(pl1103StyleIds, pl1103StyleJson)) {
          pl1103StyleIds[pl1103StyleJson] = pl1103Styles.length;
          pl1103Styles.push(pl1103Style);
        }
        pl1103Cells.push([pl1103Values[pl1103R][pl1103C], pl1103StyleIds[pl1103StyleJson]]);
      }
      pl1103Rows.push({ row: pl1103R + 1, cells: pl1103Cells });
    }
    pl1103Progress('3/6 셀 서식 정리 완료. 고유 서식 ' + pl1103Styles.length + '개');
    pl1103Stage = '열 너비·숨김';
    pl1103Progress('4/6 열 너비·숨김 조회 시작');
    var pl1103Columns = [];
    for (var pl1103Col = 1; pl1103Col <= pl1103Width; pl1103Col++) {
      pl1103CheckTime();
      pl1103Columns.push([PL1103DESIGN_columnLetters_(pl1103Col), pl1103Sheet.getColumnWidth(pl1103Col), pl1103Sheet.isColumnHiddenByUser(pl1103Col)]);
      if (pl1103Col % 5 === 0 || pl1103Col === pl1103Width) pl1103Progress('4/6 열 ' + pl1103Col + '/' + pl1103Width + ' 완료');
    }
    // 높이가 같은 연속 행은 구간으로 묶어서 로그 길이를 줄입니다.
    var pl1103RowDimensions = [];
    pl1103Stage = '행 높이·숨김';
    pl1103Progress('5/6 행 높이·숨김 조회 시작');
    for (var pl1103Row = 1; pl1103Row <= pl1103Height; pl1103Row++) {
      pl1103CheckTime();
      var pl1103Pixels = pl1103Sheet.getRowHeight(pl1103Row);
      var pl1103Hidden = pl1103Sheet.isRowHiddenByUser(pl1103Row);
      var pl1103Last = pl1103RowDimensions[pl1103RowDimensions.length - 1];
      if (pl1103Last && pl1103Last[2] === pl1103Pixels && pl1103Last[3] === pl1103Hidden) pl1103Last[1] = pl1103Row;
      else pl1103RowDimensions.push([pl1103Row, pl1103Row, pl1103Pixels, pl1103Hidden]);
      if (pl1103Row % 10 === 0 || pl1103Row === pl1103Height) pl1103Progress('5/6 행 ' + pl1103Row + '/' + pl1103Height + ' 완료');
    }
    pl1103Stage = '병합·조건부서식·결과 출력';
    pl1103Progress('6/6 ' + pl1103Stage + ' 시작');
    pl1103CheckTime();
    var pl1103Filter = pl1103Sheet.getFilter();
    var pl1103Rules = pl1103Sheet.getConditionalFormatRules().map(function (pl1103Rule) {
      var pl1103Condition = pl1103Rule.getBooleanCondition();
      return { ranges: pl1103Rule.getRanges().map(function (pl1103Item) { return pl1103Item.getA1Notation(); }),
        type: pl1103Condition ? String(pl1103Condition.getCriteriaType()) : 'GRADIENT',
        values: pl1103Condition ? pl1103Condition.getCriteriaValues().map(String) : [],
        gradient: Boolean(pl1103Rule.getGradientCondition()) };
    });
    var pl1103Meta = { sheet: pl1103Sheet.getName(), schemaVersion: 2,
      capturedRange: pl1103Range.getA1Notation(), maxRows: pl1103MaxRows, maxColumns: pl1103MaxCols,
      frozenRows: pl1103Sheet.getFrozenRows(), frozenColumns: pl1103Sheet.getFrozenColumns(),
      gridlinesHidden: pl1103Sheet.hasHiddenGridlines(), rightToLeft: pl1103Sheet.isRightToLeft(), tabColor: pl1103Sheet.getTabColor(),
      merges: pl1103Range.getMergedRanges().map(function (pl1103Item) { return pl1103Item.getA1Notation(); }),
      filter: pl1103Filter ? pl1103Filter.getRange().getA1Notation() : null,
      columnsLegend: '[열명,너비px,숨김]', rowDimensionsLegend: '[시작행,종료행,높이px,숨김]',
      cellsLegend: '[표시텍스트,STYLE ID(0부터)]',
      wrapLegend: 'CLIP=자르기 / WRAP=줄바꿈 / OVERFLOW=넘침',
      excluded: ['셀별 테두리', '조건부 서식 색상·그라데이션 원시 설정', '이미지·그림', '내용 범위 밖 빈 셀의 개별 서식'] };
    PL1103DESIGN_print_('META', pl1103Meta);
    PL1103DESIGN_print_('COLUMNS', pl1103Columns);
    PL1103DESIGN_print_('ROW_DIMENSIONS', pl1103RowDimensions);
    PL1103DESIGN_print_('CONDITIONAL_RULES', pl1103Rules);
    pl1103Styles.forEach(function (pl1103Style, pl1103Index) { PL1103DESIGN_print_('STYLE ' + pl1103Index, pl1103Style); });
    pl1103Rows.forEach(function (pl1103Item) { PL1103DESIGN_print_('ROW ' + pl1103Item.row, pl1103Item.cells); });
    pl1103Progress('6/6 추출 성공. ' + pl1103Rows.length + '개 행 / ' + pl1103Styles.length + '개 서식 출력 완료');
    console.log('=== PL1103DESIGN END ===');
  } catch (pl1103Error) {
    console.error('PL1103DESIGN 실패 [' + pl1103Stage + '] 경과 ' + ((Date.now() - pl1103Started) / 1000).toFixed(1) + '초: ' + pl1103Error.message);
    throw pl1103Error;
  }
}

function PL1103DESIGN_print_(pl1103Label, pl1103Value) {
  var pl1103Text = JSON.stringify(pl1103Value);
  var pl1103Count = Math.ceil(pl1103Text.length / 6000) || 1;
  for (var pl1103Part = 0; pl1103Part < pl1103Count; pl1103Part++) {
    console.log(pl1103Label + (pl1103Count > 1 ? ' [' + (pl1103Part + 1) + '/' + pl1103Count + ']' : '') + ': ' + pl1103Text.slice(pl1103Part * 6000, (pl1103Part + 1) * 6000));
  }
}

function PL1103DESIGN_columnLetters_(pl1103Number) {
  var pl1103Letters = '';
  while (pl1103Number > 0) {
    pl1103Number--;
    pl1103Letters = String.fromCharCode(65 + pl1103Number % 26) + pl1103Letters;
    pl1103Number = Math.floor(pl1103Number / 26);
  }
  return pl1103Letters;
}
