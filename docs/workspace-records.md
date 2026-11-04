# 메모 · 송출 Q&A

- 메모: `workspace/memos/items/{pushId}`
- 송출 Q&A: `workspace/broadcastQa/items/{pushId}`
- 각 상위 경로에는 schemaVersion=1 및 createdAt을 기록한다.
- 초기 접속 시 트랜잭션으로 경로가 없는 경우만 초기화한다. 메모의 기존 정적 9개 항목은 최초 한 번 보관한다.
- 삭제 후 비어 있는 목록에 초기 항목을 다시 생성하지 않는다. Q&A는 빈 목록으로 시작한다.
- `node scripts/initialize-workspace.mjs`로 서버 경로를 미리 준비할 수 있다.

## 필드

공통: title, content, category, status, priority, createdAt, updatedAt.
Q&A 추가: answer, broadcastDate, materialId.
메모 상태: 할 일 / 진행 중 / 완료. Q&A 상태: 미답변 / 확인 중 / 해결.
해결 상태는 답변이 있어야 저장 가능하다. createdAt/updatedAt은 서버 타임스탬프이다.
로그인 작성자는 아직 연동하지 않는다.

추가/수정은 명시적 저장 버튼, 삭제는 확인 후 수행한다. 목록은 RTDB onValue로 동기화한다.
수정은 항목 단위 트랜잭션으로 수행하여 다른 사용자가 삭제한 항목이 일부 필드만 복원되지 않게 한다.
동일 항목의 동시 수정은 마지막 저장 내용이 반영된다.
제목·본문·답변·분류·소재ID·방송일자 통합 검색 및 상태 필터는 현재 목록에서 수행한다.
항목이 대량 누적되면 페이지네이션과 서버 검색 인덱스를 별도로 도입할 수 있다.

Firebase 서버 규칙은 변경하지 않는다. `workspace` 이하 읽기·쓰기가 허용되어야 한다.
