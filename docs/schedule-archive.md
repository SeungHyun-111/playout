# 주조 운행표 저장 및 검색

내보내는 날짜·채널의 운행표를 저장한다. 같은 날짜를 다시 저장하면 해당 날짜는 최신 저장본 하나로 교체한다.
저장 ID는 `current`로 고정한다. 해당 날짜에 기존 버전이 있으면 원본과 검색 인덱스를 새 저장본과 함께 원자적으로 교체한다. 다른 날짜는 유지한다.
하나의 루트 update로 원본, 날짜 목록, 버전 목록, 검색 인덱스를 함께 기록한다.
성공 메시지는 서버가 쓰기를 승인한 뒤 표시된다. 기존 timeBlock/settings 자동 저장과 별개이다.

## 경로

- `scheduleArchive/dates/{YYYY-MM-DD}`: 최신 저장 버전, 서버 저장시각, 건수
- `scheduleArchive/versions/{date}/{versionId}`: 필드명이 있는 events, 원본 표, 생성 입력·설정 스냅샷
- `scheduleArchive/versionHistory/{date}/current`: 최신 저장 요약 하나 (기존 조회 구조 호환)
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
await loadSavedSchedule("2026-11-04", "current"); // 날짜별 최신 저장본
await findMaterialSchedules("0P001", "2026-11-01", "2026-11-30");
```

소재 검색은 반드시 dates의 최신 versionId와 일치하는 사용 내역만 반환한다.
교체 시 더 이상 사용하지 않는 소재·프로그램 인덱스도 제거한다.
이벤트 ID는 버전 내부의 식별자이다. 버전 간 동일 방송 추적용 영구 ID는 아니다.

## 의미 및 운영

- 방송일자는 업무상 방송일이며, 자정 넘김 종료시각은 다음 날일 수 있다. timezone은 Asia/Seoul이다.
- status=scheduled는 송출 예정이다. 실제 송출 확인은 향후 송출 로그 연동이 필요하다.
- 광고 생성 로직에는 채널 정보가 없어서 광고 채널은 빈 문자열이다. 본편은 원본 채널 표기를 유지한다.
- 입력·설정 스냅샷은 전체 작업 상태를 보관하며, events는 선택한 방송일자별로 분리한다.
- 최신은 마지막으로 서버에 저장된 버전이다. 동시 편집 충돌 감지·로그인 작성자 기록은 아직 없다.
- 기존 Firebase 서버 보안 규칙을 변경하지 않는다. 해당 경로 읽기/쓰기가 허용되어야 동작한다.
- 검색/다운로드 화면은 아직 없으며 위 API로 구현할 수 있다.

구글 시트 수정본은 별도 탭으로 유지하지만 RTDB에는 날짜별 최신 값만 남긴다. 기존 날짜는 다음 저장 시 이전 버전이 정리된다.
