const memoItems = [
  "공익방송 셋팅",
  "운행시간표관리 메뉴 파일 생성(채널1,2 두벌)",
  "기획PGM 관리메뉴 생성",
  "https://docs.google.com/spreadsheets/d/1rkoxPQkJssM-ZH5dkQConbb2tbx6ctZPhZGzq9k6UVU/edit?gid=2034959207#gid=2034959207",
  "편성팀 운행표 생성",
  "주조정실 화면기반 코치마크 생성",
];

export default function WorkMemo() {
  return (
    <div className="output-page">
      <header className="topbar">
        <div>
          <h1>메모</h1>
          <p>이어서 작업할 내용을 임시로 적어두는 페이지입니다.</p>
        </div>
      </header>

      <section className="settings-workspace">
        <div className="memo-panel">
          <h2>작업 메모</h2>
          <ul>
            {memoItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
