const scheduleWriteUrl =
  "https://docs.google.com/spreadsheets/d/1rkoxPQkJssM-ZH5dkQConbb2tbx6ctZPhZGzq9k6UVU/edit?gid=2034959207#gid=2034959207";

export default function ScheduleWrite({ mode = "bulk" }) {
  const title = mode === "master" ? "주조 운행표" : "내부 일괄등록";
  return (
    <div className="output-page">
      <header className="topbar">
        <div>
          <h1>{title}</h1>
          <p>{mode === "master" ? "주조 운행표 생성 작업을 진행합니다." : "내부 일괄등록 작업을 진행합니다."}</p>
        </div>
        <a className="primary-action" href={scheduleWriteUrl} target="_blank" rel="noreferrer">
          운행표 열기
        </a>
      </header>

      <section className="settings-workspace">
        <div className="memo-panel">
          <h2>{title}</h2>
          <p>
            <a href={scheduleWriteUrl} target="_blank" rel="noreferrer">
              Google Sheets 운행표
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
