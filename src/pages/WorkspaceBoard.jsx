import { useRef, useState } from "react";
import useWorkspaceRecords from "../hooks/useWorkspaceRecords.js";
import "../styles/workspace-board.css";

const EMPTY_DEFAULTS = [];
const CATEGORIES = ["일반","편성·운행표","소재·광고","자막·배너","송출 장애","시스템"];
const CONFIG = {
  memos:{title:"메모",singular:"메모",description:"작업 내용과 우선순위를 기록하고 관리합니다.",statuses:["할 일","진행 중","완료"]},
  broadcastQa:{title:"송출 Q&A",singular:"질문",description:"송출 관련 질문과 해결 방법을 기록하고 검색합니다.",statuses:["미답변","확인 중","해결"]},
};
const blank = config => ({title:"",content:"",answer:"",category:"일반",status:config.statuses[0],priority:"보통",broadcastDate:"",materialId:""});
const formatTime = value => value ? new Date(value).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}) : "저장 중";

export default function WorkspaceBoard({collection,defaults=EMPTY_DEFAULTS}) {
  const config=CONFIG[collection], isQa=collection === "broadcastQa";
  const {records,loading,error,save,erase}=useWorkspaceRecords(collection,defaults);
  const [query,setQuery]=useState(""),[filter,setFilter]=useState("");
  const [draft,setDraft]=useState(null),[editingId,setEditingId]=useState(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[actionError,setActionError]=useState("");
  const pending=useRef(false);
  const visible=records.filter(item=>(!filter || item.status === filter) && [item.title,item.content,item.answer,item.category,item.materialId,item.broadcastDate].join(" ").toLocaleLowerCase("ko").includes(query.trim().toLocaleLowerCase("ko")));
  const start = item => {
    if(draft && !window.confirm("작성 중인 내용을 닫고 다른 항목을 여시겠습니까?")) return;
    setEditingId(item?.id || null);setDraft({...blank(config),...item});setMessage("");setActionError("");
  };
  const close = () => {
    if(window.confirm("저장하지 않은 내용을 닫으시겠습니까?")){setDraft(null);setEditingId(null);setActionError("");}
  };
  const change = event => setDraft(current=>({...current,[event.target.name]:event.target.value}));
  const submit = async event => {
    event.preventDefault();if(pending.current) return;
    if(!draft.title.trim() || !draft.content.trim()){setActionError("제목과 내용을 입력해주세요.");return;}
    if(isQa && draft.status === "해결" && !draft.answer.trim()){setActionError("해결 상태로 저장하려면 답변을 입력해주세요.");return;}
    pending.current=true;setBusy(true);setActionError("");setMessage("");
    try {
      const fields=Object.fromEntries(Object.keys(blank(config)).map(key=>[key,String(draft[key] || "").trim()]));
      await save(editingId,fields);
      setDraft(null);setEditingId(null);setMessage(`${config.title}를 저장했습니다.`);
    } catch {setActionError("저장하지 못했습니다. 입력 내용은 유지됩니다. DB 연결과 쓰기 권한을 확인해주세요.");}
    finally {pending.current=false;setBusy(false);}
  };
  const destroy = async item => {
    if(pending.current || !window.confirm(`‘${item.title}’ 항목을 삭제하시겠습니까?`)) return;
    pending.current=true;setBusy(true);setActionError("");setMessage("");
    try {await erase(item.id);if(editingId===item.id){setDraft(null);setEditingId(null);}setMessage("삭제했습니다.");}
    catch {setActionError("삭제하지 못했습니다. DB 연결과 쓰기 권한을 확인해주세요.");}
    finally {pending.current=false;setBusy(false);}
  };
  return <div className="output-page workspace-board">
    <header className="topbar"><div><h1>{config.title}</h1><p>{config.description}</p></div><button type="button" disabled={loading || busy || Boolean(error)} onClick={()=>start(null)}>+ {config.singular} 작성</button></header>
    <div className="board-toolbar">
      <label className="board-search">검색<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={isQa ? "질문·답변·소재ID 검색" : "제목·내용 검색"} /></label>
      <label>상태<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="">전체</option>{config.statuses.map(status=><option key={status}>{status}</option>)}</select></label>
      <span>{visible.length} / {records.length}건</span>
    </div>
    {loading && <p className="board-notice" role="status">DB에서 목록을 불러오는 중입니다…</p>}
    {(error || actionError) && <p className="board-notice board-error" role="alert">{error || actionError}</p>}
    {message && <p className="board-notice" role="status">{message}</p>}
    <div className={`board-body ${draft ? "has-editor" : ""}`}>
      {draft && <form className="board-editor" onSubmit={submit}>
        <h2>{editingId ? `${config.title} 수정` : `새 ${config.singular}`}</h2>
        <fieldset disabled={busy}>
          <label>제목<input autoFocus name="title" value={draft.title} onChange={change} required maxLength={200} /></label>
          <div className="board-fields"><label>분류<select name="category" value={draft.category} onChange={change}>{CATEGORIES.map(category=><option key={category}>{category}</option>)}</select></label>
          <label>상태<select name="status" value={draft.status} onChange={change}>{config.statuses.map(status=><option key={status}>{status}</option>)}</select></label>
          {!isQa && <label>우선순위<select name="priority" value={draft.priority} onChange={change}>{["높음","보통","낮음"].map(priority=><option key={priority}>{priority}</option>)}</select></label>}</div>
          <label>{isQa ? "질문 / 상황" : "내용"}<textarea name="content" value={draft.content} onChange={change} rows={6} required maxLength={20000} /></label>
          {isQa && <><label>답변 / 해결 방법<textarea name="answer" value={draft.answer} onChange={change} rows={6} maxLength={20000} /></label><div className="board-fields"><label>관련 방송일자<input type="date" name="broadcastDate" value={draft.broadcastDate} onChange={change} /></label><label>관련 소재ID<input name="materialId" value={draft.materialId} onChange={change} maxLength={200} /></label></div></>}
          <div className="actions"><button type="submit">{busy ? "처리 중…" : "저장"}</button><button type="button" onClick={close}>취소</button></div>
        </fieldset>
      </form>}
      <section className="board-list" aria-label={`${config.title} 목록`}>
        {!loading && !error && !visible.length && <div className="empty-state"><strong>{records.length ? "검색 결과가 없습니다." : `등록된 ${config.title}가 없습니다.`}</strong><p>{records.length ? "검색어나 상태 조건을 변경해주세요." : "작성 버튼으로 첫 항목을 등록해주세요."}</p></div>}
        {visible.map(item=><article className="board-card" key={item.id}>
          <div className="board-card-heading"><span className={`board-badge ${item.status === config.statuses[2] ? "is-done" : ""}`}>{item.status}</span><span>{item.category}</span>{!isQa && <span>우선순위 {item.priority}</span>}</div>
          <h2>{item.title}</h2><p className="board-content">{item.content}</p>
          {isQa && <div className="board-answer"><strong>답변 / 해결 방법</strong><p className="board-content">{item.answer || "아직 등록된 답변이 없습니다."}</p></div>}
          {isQa && (item.broadcastDate || item.materialId) && <p>관련 방송일 {item.broadcastDate || "—"} · 소재ID {item.materialId || "—"}</p>}
          <footer><small>작성 {formatTime(item.createdAt)}<br/>수정 {formatTime(item.updatedAt)}</small><div className="actions"><button type="button" disabled={busy || Boolean(error)} onClick={()=>start(item)}>수정</button><button type="button" disabled={busy || Boolean(error)} onClick={()=>destroy(item)}>삭제</button></div></footer>
        </article>)}
      </section>
    </div>
  </div>;
}
