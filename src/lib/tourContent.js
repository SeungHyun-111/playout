const step=(target,title,description,page)=>({target,title,description,...(page ? {page} : {})});
const coach=id=>`[data-coach="${id}"]`;
export const WORKFLOW_STEPS=[
  step(coach("timeblock-sheet"),"1. TimeBlock 입력","엑셀에서 복사한 편성 자료를 표에 붙여넣습니다. 방송일자·시간·채널·소재ID 등 원본 정보를 확인하세요. 입력은 자동 저장됩니다.","timeblock-input"),
  step(".priority-board","2. 기본 운영 규칙 확인","배너 적용 순서와 기본 소재, 카드배너 미운영 MD분류, 상품명·편성코드명 제외 키워드를 확인합니다.","operation-settings"),
  step(".event-card-month","3. 행사카드 일정 확인","방송 월을 선택하고 날짜별 카드배너 소재를 등록합니다. 내부 일괄등록의 플로팅배너1에 반영됩니다.","settings-event-card"),
  step(coach("promotion-program-names"),"4. 프로모션 적용 대상 확인","프로모션을 선택한 뒤 적용 기간과 편성코드명 목록, 배너 소재를 확인합니다. 기획PGM 설정도 같은 메뉴에서 관리합니다.","settings-promotion"),
  step(".periods-page-toolbar","5. 필요한 기간의 예외 순서 설정","기간을 추가하고 카드배너 제외·특수요청·특정 프로모션·기획PGM을 함께 정렬할 수 있습니다. 예외 기간 밖에서는 기본 순서를 사용합니다.","settings-exceptions"),
  step(".bulk-registration-table","6. 내부 일괄등록 검토","TimeBlock과 운영설정으로 생성된 결과입니다. 프로모션명, 카드제외 여부, 플로팅배너1~5를 확인하고 필요한 셀을 수정합니다.","schedule-bulk"),
  step(".schedule-view-controls","7. 소재 확인과 검색","소재명으로 보기를 켜서 실제 이름으로 검토하고, 검색으로 원하는 행을 찾습니다. 전체 날짜 검색 범위도 선택할 수 있습니다.","schedule-bulk"),
  step(coach("bulk-export"),"8. 내부 등록용 파일 출력","내려받기·인쇄에서 채널을 선택해 XLS 파일을 만들 수 있습니다. 소재ID와 앞자리 0을 유지하는 텍스트 형식으로 출력합니다.","schedule-bulk"),
  step(coach("advertisement-schedule"),"9. 광고 설정 확인","시작 시간대의 첫 방송 앞에 삽입할 광고 소재와 시간을 설정합니다. 광고 목록에서 이름과 길이도 관리합니다.","schedule-ads"),
  step(coach("master-save"),"10. 주조 운행표 저장","날짜를 선택한 후 저장하면 해당 날짜 전체 운행표가 RTDB에 새 버전으로 보관됩니다. 검색으로 행을 줄여도 저장 대상은 선택 날짜 전체입니다. 소재·방송 검색 인덱스도 함께 생성됩니다.","schedule-master"),
  step(coach("workspace-board"),"11. 인수인계와 송출 Q&A","메모에는 후속 작업을, 송출 Q&A에는 질문·답변·해결 방법을 기록하세요. 저장한 운행표는 송출 예정 정보이며 실제 송출 완료를 뜻하지 않습니다.","broadcast-qa"),
];
const commonSchedule=[
  step(".date-selection","방송일자 선택","전체 또는 여러 날짜를 선택할 수 있습니다. 조회·복사·출력 대상 날짜를 먼저 확인하세요."),
  step(".schedule-view-controls","검색과 소재명 보기","모든 열의 값과 소재명을 검색합니다. 전체 날짜 검색을 선택하면 날짜 선택 범위를 넘어 검색합니다. 소재명은 표시용이며 복사·내려받기·DB 저장은 ID를 사용합니다."),
];
export const MENU_HELP={
  "operation-settings":[step(".priority-card-row","기본 우선순위","기본 규칙의 적용 순서를 확인합니다. 기간별 예외 설정이 있으면 그 기간에는 예외 목록의 순서를 따릅니다."),step(".default-settings-panel","기본 소재와 카드 제외","기간별 기본 소재와 미운영 MD분류, 제외 키워드를 관리합니다. 제외 키워드는 상품명 또는 편성코드명 중 하나에 포함되면 적용됩니다.")],
  "settings-exceptions":[step(".periods-page-toolbar","기간별 예외 관리","기간 추가로 공통 시작·종료일을 한 번 정합니다. 전체 펼치기·접기로 목록을 정리하고 도움말에서 적용 방식을 볼 수 있습니다."),step(".exception-period-panel, .periods-page-toolbar","기간 이름과 상세 목록","기간 제목을 누르면 이름·날짜와 우선순위 목록이 열립니다. 항목을 추가하거나 순서를 이동하세요. 신규는 초록, 순서 변경은 파랑, 내용 수정은 노랑으로 표시됩니다. 기간이 겹치면 위쪽 설정이 먼저 적용됩니다.")],
  "settings-banner":[step(coach("operation-settings-panel"),"배너 소재 목록","소재ID·소재명과 위치 유형을 등록합니다. 카드배너·CI배너·L바·스크롤 등의 위치는 설정한 슬롯에 반영됩니다.")],
  "settings-event-card":[step(".event-month-toolbar","월 선택","행사카드를 관리할 월을 선택합니다. 날짜별 소재와 적용 기간을 확인하세요."),step(".event-card-month","날짜별 행사카드","날짜별로 행사카드와 소재를 입력합니다. 카드 제외 규칙에 해당하는 방송에는 설정한 우선순위에 따라 카드 적용이 제한될 수 있습니다.")],
  "schedule-bulk":[...commonSchedule,step(".bulk-registration-table","셀 수정과 붙여넣기","직접 수정한 셀은 자동 생성값보다 우선해 유지됩니다. 소재명 보기에서는 소재 셀을 읽기만 하며, ID 보기로 돌아가 수정할 수 있습니다."),step(coach("bulk-export"),"XLS 내려받기·인쇄","표시된 결과에서 출력할 채널을 고릅니다. 원천 기준으로 재생성을 누르면 수동 수정과 추가 행이 초기화됩니다.")],
  "schedule-master":[...commonSchedule,step(".master-schedule-table","최종 운행표","내부 일괄등록의 방송과 광고 설정을 합친 결과입니다. 원본 수정은 내부 일괄등록·운영설정에서 합니다. 맨 오른쪽 편성팀 코멘트는 직접 입력하며 자동 저장됩니다."),step(coach("master-comment"),"편성팀 코멘트 직접 입력","이 열은 자동 생성하지 않습니다. 방송별로 코멘트를 입력하면 작업 상태에 저장되고, 운행표 저장 시 해당 버전에도 함께 보관됩니다."),step(coach("master-save"),"날짜별 버전 저장","선택 날짜의 전체 일정을 서버에 저장합니다. 이전 버전은 유지되고 완료 메시지는 서버 저장 성공 후 표시됩니다. 저장본 검색 화면은 아직 제공되지 않습니다.")],
  "schedule-ads":[step(coach("advertisement-schedule"),"광고 편성","시작 시간대의 첫 방송 앞에 광고가 삽입됩니다. 소재ID·소재명·광고 길이를 확인하세요."),step(coach("advertisement-catalog"),"광고 목록","자주 쓰는 광고 소재·이름·길이를 등록합니다. 편성 행에서 비워 둔 이름과 길이를 목록에서 보완합니다.")],
  "work-memo":[step(".workspace-board .topbar","작업 메모 작성","메모 작성으로 제목·내용·분류·상태·우선순위를 입력합니다. 수정·삭제할 수 있으며 DB에 저장됩니다."),step(".board-toolbar","메모 검색","제목과 내용 등을 검색하고 상태로 좁힙니다. 아래 목록에서 작성·수정 시각을 확인합니다.")],
  "broadcast-qa":[step(".workspace-board .topbar","송출 Q&A 작성","질문과 상황, 답변·해결 방법, 분류와 상태를 기록합니다. 관련 방송일자와 소재ID도 함께 남길 수 있습니다."),step(".board-toolbar","답변 검색과 관리","질문·답변·소재ID 등으로 검색하고 상태를 선택합니다. 해결 상태로 저장하려면 답변이 필요합니다. 수정과 삭제도 가능합니다.")],
};
export function getMenuHelp(page,localSteps=[]) {
  if(page==="schedule-write")page="schedule-bulk";
  return MENU_HELP[page] || (localSteps.length ? localSteps : [step(".page .topbar","현재 메뉴 안내","이 화면에서 입력 내용을 확인하고 필요한 기능을 선택하세요.")]);
}
