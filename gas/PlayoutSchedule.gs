/**
 * Playout 주조운행표 수신 웹 앱
 *
 * 대상 스프레드시트 ID는 아래 코드에 직접 지정되어 있습니다. 별도 속성 설정은 없습니다.
 * 배포: 웹 앱 / 실행 사용자: 나 / 액세스: 전송 환경에 맞게 설정.
 *
 * POST JSON (Content-Type: text/plain;charset=utf-8도 가능):
 * { mode: "initial" 또는 "revision",
 *   broadcastDate: "2026-11-03", channel: "CH1",
 *   rows: [[현재 MASTER_HEADERS 순서의 25개 값], ...] }
 * 상단: L1 특이사항 / M1 빈칸 / A2:A4 원본 안내 문구 / A6 채널 / 7행 열 제목.
 * 한 요청은 한 방송일자·한 채널입니다. rows에는 검색 결과가 아닌 해당 날짜
 * 전체 운행표를 보냅니다. P/Q(영상코드/파일명)는 제외한 현재 앱 양식입니다.
 * initial: 1106CH1 / 1106CH2,3,4 (실제 채널 값을 유지)
 * revision: 1106CH1_수정_1104_180000 (기존 탭 유지)
 * 양식: 같은 스프레드시트의 1103CH1을 복제한 뒤 P/Q열을 제거합니다.
 * 응답 JSON의 ok를 확인해야 합니다. HTTP 성공만으로 저장 성공을 판단하지 않습니다.
 * 재전송한 revision은 별도 탭을 생성하므로 자동 재시도는 하지 않습니다.
 */
var PLAYOUT_HEADERS = [
  'No', '방송일자', '시작시간', '방송시간(분)', '광고시간(초)', '종료시간',
  '소재ID', '다원방송', '프로그램코드', '프로그램명', '편성코드', '편성코드명',
  '제작프로그램명', '카테고리명', 'MD분류명', '배너소재', '배너시간',
  '배너소재2', '배너시간', '배너소재3', '배너시간', '배너소재4', '배너시간',
  '배너소재5', '편성팀 코멘트'
];
var PLAYOUT_SPREADSHEET_ID = '1rkoxPQkJssM-ZH5dkQConbb2tbx6ctZPhZGzq9k6UVU';

function doGet() {
  return json_({ ok: true, service: 'playout-schedule', schemaVersion: 1, layoutVersion: 2, template: '1103CH1' });
}

function doPost(e) {
  var logs = [];
  var stage = '요청 확인';
  var requestId = Utilities.getUuid();
  function log(message) {
    var line = Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm:ss') + ' [' + stage + '] ' + message;
    logs.push(line);
    console.log(requestId + ' ' + line);
  }
  var lock = LockService.getScriptLock();
  var locked = false;
  var book;
  var sheet;
  var committed = false;
  try {
    log('요청 수신');
    var bookId = PLAYOUT_SPREADSHEET_ID;
    if (!e || !e.postData || !e.postData.contents) throw new Error('POST JSON 본문이 필요합니다.');
    var data = JSON.parse(e.postData.contents);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('올바른 JSON 객체가 필요합니다.');
    stage = '데이터 검증';
    if (data.mode !== 'initial' && data.mode !== 'revision') throw new Error('mode는 initial 또는 revision이어야 합니다.');
    var date = date_(data.broadcastDate);
    var channel = data.channel === undefined ? 'CH1' : String(data.channel).trim();
    if (!channel || channel.length > 40 || /[\[\]:*?\/\\\x00-\x1f]/.test(channel) || channel.replace(/\s/g, '') === '전체') throw new Error('채널 값을 확인하세요. 전체는 개별 채널 탭에 포함하여 전송합니다.');
    if (!Array.isArray(data.rows) || !data.rows.length || data.rows.length > 10000) throw new Error('운행표는 1~10000행이어야 합니다.');
    var rows = data.rows.map(function (row, index) {
      if (!Array.isArray(row) || row.length !== PLAYOUT_HEADERS.length) throw new Error((index + 1) + '행은 25개 열이어야 합니다.');
      if (date_(row[1]) !== date) throw new Error((index + 1) + '행의 방송일자가 다릅니다.');
      return row.map(function (value, col) {
        if (col === 0) return String(index + 1);
        if (value === null || value === undefined) return '';
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw new Error('셀에는 문자·숫자만 전송하세요.');
        var text = String(value);
        if (text.length > 45000) throw new Error('셀 내용이 너무 깁니다.');
        // setValues의 수식 실행을 막고 소재ID·시간·선행 0을 문자로 보존합니다.
        return /^[=+\-@']/.test(text) ? "'" + text : text;
      });
    });
    log(date + ' / ' + channel + ' / ' + rows.length + '행 검증 완료');
    stage = '전송 잠금';
    if (!lock.tryLock(30000)) throw new Error('다른 전송을 처리 중입니다. 잠시 후 다시 전송하세요.');
    locked = true;
    stage = '스프레드시트 열기';
    book = SpreadsheetApp.openById(bookId);
    log('대상 스프레드시트 연결 완료');
    stage = '탭 생성';
    var base = playoutSheetName_(date, channel);
    var legacyBase = date + '_' + channel + '_주조운행표';
    var initialSheet = book.getSheetByName(base) || book.getSheetByName(legacyBase);
    var name = base;
    if (data.mode === 'initial' && initialSheet) throw new Error('초기본이 이미 있습니다. 수정 전송을 사용하세요.');
    if (data.mode === 'revision') {
      if (!initialSheet) throw new Error('초기본이 없습니다. 초기 전송을 먼저 해주세요.');
      name += '_수정_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMdd_HHmmss');
      var suffix = 2;
      var candidate = name;
      while (book.getSheetByName(candidate)) candidate = name + '_' + suffix++;
      name = candidate;
    }
    stage = '원본 양식 확인';
    var template = book.getSheets().filter(function (item) { return item.getName().trim().toUpperCase() === '1103CH1'; })[0];
    if (!template) throw new Error('양식 기준 탭 1103CH1이 없습니다.');
    if (template.getRange('P7').getDisplayValue() !== '영상코드' || template.getRange('Q7').getDisplayValue() !== '파일명') {
      throw new Error('1103CH1의 P7=영상코드, Q7=파일명 구조가 달라졌습니다. 열 위치를 확인해주세요.');
    }
    log('1103CH1 양식 확인 완료');
    stage = '양식 복제';
    sheet = template.copyTo(book);
    sheet.setName(name);
    log(name + ' 생성: 열 너비·행 높이·폰트·테두리·넘침 설정 복제 완료');
    stage = 'P/Q열 제거 및 내용 입력';
    playoutFillTemplate_(sheet, rows, channel, log);
    stage = '저장 확정';
    SpreadsheetApp.flush();
    log(rows.length + '행 저장 완료');
    var result = { ok: true, mode: data.mode, broadcastDate: date, channel: channel, sheetName: name,
      sheetId: sheet.getSheetId(), rowCount: rows.length, url: book.getUrl() + '#gid=' + sheet.getSheetId() };
    result.requestId = requestId;
    result.stage = '완료';
    result.message = name + ' 생성 및 입력 완료';
    result.logs = logs;
    committed = true;
    return json_(result);
  } catch (error) {
    log('실패: ' + (error.message || String(error)));
    // 실패한 이번 탭만 정리합니다. 기존 운행표는 변경하지 않습니다.
    if (sheet && book && !committed) {
      try { book.deleteSheet(sheet); log('이번 요청으로 만든 불완전한 탭 삭제 완료'); }
      catch (cleanupError) { log('불완전한 탭 정리 실패: ' + cleanupError.message); }
    }
    return json_({ ok: false, requestId: requestId, stage: stage, error: error.message || '전송 처리에 실패했습니다.', logs: logs });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function date_(value) {
  var match = String(value || '').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) throw new Error('방송일자는 YYYY-MM-DD 또는 YYYY/MM/DD 형식이어야 합니다.');
  var date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() + 1 !== Number(match[2]) || date.getUTCDate() !== Number(match[3])) throw new Error('존재하지 않는 방송일자입니다.');
  return date.toISOString().slice(0, 10);
}

function playoutSheetName_(date, channel) {
  var label = String(channel).trim().replace(/^채널\s*/i, '').replace(/^CH\s*/i, '');
  return date.slice(5, 7) + date.slice(8, 10) + 'CH' + label;
}

function playoutFillTemplate_(sheet, rows, channel, log) {
  // 원본: A:O 공통 15열 / P:Q 숨김 2열 / R:Z 배너 9열.
  // 출력: A:O 공통 15열 / P:X 배너 9열 / Y 편성팀 코멘트.
  sheet.deleteColumns(16, 2);
  var count = PLAYOUT_HEADERS.length;
  if (sheet.getMaxColumns() < count) sheet.insertColumnsAfter(sheet.getMaxColumns(), count - sheet.getMaxColumns());
  var finalRow = rows.length + 7;
  if (sheet.getMaxRows() < finalRow) sheet.insertRowsAfter(sheet.getMaxRows(), finalRow - sheet.getMaxRows());
  var filter = sheet.getFilter();
  if (filter) filter.remove();
  // 복제된 지난 날짜 방송·메모·수식은 모두 제거합니다. 서식은 남깁니다.
  sheet.getRange(8, 1, sheet.getMaxRows() - 7, sheet.getMaxColumns()).clearContent().clearNote();
  // 8행을 본문 표준으로 반복하여 옛 방송의 개별 수정색·행 높이를 가져오지 않습니다.
  sheet.getRange(8, 1, 1, 24).copyFormatToRange(sheet, 1, 24, 8, finalRow);
  sheet.setRowHeightsForced(8, rows.length, sheet.getRowHeight(8));
  sheet.getRange(7, 24).copyFormatToRange(sheet, 25, 25, 7, 7);
  sheet.getRange(8, 24).copyFormatToRange(sheet, 25, 25, 8, finalRow);
  sheet.setColumnWidth(25, 240);
  // 기존 셀의 넘침·자르기·정렬·글꼴은 유지하고, 데이터만 문자열로 입력합니다.
  sheet.getRange(7, 1, 1, count).setNumberFormat('@').setValues([PLAYOUT_HEADERS]);
  sheet.getRange(8, 1, rows.length, count).setNumberFormat('@').setValues(rows);
  if (sheet.getMaxRows() > finalRow) sheet.getRange(finalRow + 1, 1, sheet.getMaxRows() - finalRow, sheet.getMaxColumns()).clearFormat();
  // 이미지의 검은 테두리 표를 코멘트 열까지 연장합니다.
  sheet.getRange(7, 25, rows.length + 1, 1).setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('L1').setValue('특이사항');
  sheet.getRange('M1').clearContent().clearNote();
  sheet.getRange('A6').setValue('CH' + String(channel).trim().replace(/^채널\s*/i, '').replace(/^CH\s*/i, ''));
  // 기존 안내문은 유지하되, 실제 코멘트 위치는 삭제된 P/Q열만큼 이동한 Y열입니다.
  sheet.getRange('A2').setValue('- Y열 편성팀 코멘트 작성');
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
  sheet.setHiddenGridlines(false);
  log('P/Q 제거 완료: 배너 P:X / 편성팀 코멘트 Y / 헤더 7행 / 본문 8행부터 ' + rows.length + '건');
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
