# 주조 운행표 저장 및 검색

주조 운행표에서 선택한 날짜 전체를 저장한다. 같은 날짜를 다시 저장하면 새 버전이 생성된다.
하나의 루트 update로 원본, 날짜 목록, 버전 목록, 검색 인덱스를 함께 기록한다.
성공 메시지는 서버가 쓰기를 승인한 뒤 표시된다. 기존 timeBlock/settings 자동 저장과 별개이다.

## 경로

- `scheduleArchive/dates/{YYYY-MM-DD}`: 최신 저장 버전, 서버 저장시각, 건수
- `scheduleArchive/versions/{date}/{versionId}`: 필드명이 있는 events, 원본 표, 생성 입력·설정 스냅샷
- `scheduleArchive/versionHistory/{date}/{versionId}`: 가벼운 버전 목록
- `scheduleArchive/materialUsage/{encodedMaterialId}/{date}/{versionId}/{usageId}`: 본편·광고·배너 슬롯별 사용 내역
- `scheduleArchive/programUsage/{encodedCode}/{date}/{versionId}/{eventId}`: 프로그램코드·편성코드 검색

`searchKey`는 ID를 UTF-8 hex로 변환한다. 앞자리 0, 대소문자를 유지하며 RTDB 금지 문자를 피한다.
RTDB 키 길이 제한상 비정상적으로 긴 소재ID는 저장이 거절될 수 있다.
현재 날짜 범위는 키 쿼리를 사용하므로 추가 `.indexOn`은 필요 없다.
프로그램명 부분 검색 등은 별도 파생 인덱스를 추가해야 한다.

## 재사용 API

`src/lib/queryScheduleArchive.js`:

```js
await listSavedScheduleDates("2026-11-01", "2026-11-30");
await loadSavedSchedule("2026-11-04"); // 최신 저장본
await loadSavedSchedule("2026-11-04", versionId); // 과거 버전
await findMaterialSchedules("0P001", "2026-11-01", "2026-11-30");
```

소재 검색은 반드시 dates의 최신 versionId와 일치하는 사용 내역만 반환한다.
과거 버전의 소재 인덱스를 단순 합산하면 삭제·변경된 편성까지 중복 집계된다.
이벤트 ID는 버전 내부의 식별자이다. 버전 간 동일 방송 추적용 영구 ID는 아니다.

## 의미 및 운영

- 방송일자는 업무상 방송일이며, 자정 넘김 종료시각은 다음 날일 수 있다. timezone은 Asia/Seoul이다.
- status=scheduled는 송출 예정이다. 실제 송출 확인은 향후 송출 로그 연동이 필요하다.
- 광고 생성 로직에는 채널 정보가 없어서 광고 채널은 빈 문자열이다. 본편은 원본 채널 표기를 유지한다.
- 입력·설정 스냅샷은 전체 작업 상태를 보관하며, events는 선택한 방송일자별로 분리한다.
- 최신은 마지막으로 서버에 저장된 버전이다. 동시 편집 충돌 감지·로그인 작성자 기록은 아직 없다.
- 기존 Firebase 서버 보안 규칙을 변경하지 않는다. 해당 경로 읽기/쓰기가 허용되어야 동작한다.
- 검색/다운로드 화면은 아직 없으며 위 API로 구현할 수 있다.

전체 이력 보관으로 DB 사용량은 누적된다. 장기 운영 시 과거 버전 보존 기간을 정해 관리한다.
