import { useState } from "react";

const ADDRESS_BOOK = {
  dawon: {
    to: ["lsh5571@sk.com", "l.sh@sk.com", "yloveis@sk.com", "kyu1216@sk.com", "mcr_air@skstoa.com", "402mini@sk.com"],
    cc: ["SKSTOA.ORG.1801@SK.COM", "lionspark@sk.com", "carter24@sk.com", "milkoz@sk.com", "youngmi5.kim@sk.com", "ymlee@cware.co.kr"],
  },
  epg: {
    to: ["skyepg@epg.co.kr", "skyepg@epg.kr"],
    cc: ["SKSTOA.ORG.1801@SK.COM"],
  },
};

export function buildOutputMailto(kind, date) {
  const { to, cc } = ADDRESS_BOOK[kind];
  const label = String(date || "");
  const subject = kind === "dawon" ? `${label} 다원방송 송출일정 공유드립니다.` : `[SK스토아]${label} 편성정보 송부`;
  return `mailto:${to.join(";")}?cc=${encodeURIComponent(cc.join(";"))}&subject=${encodeURIComponent(subject)}`;
}

// Inline the screen styles because Outlook cannot load this application's CSS.
export function buildOutputMailBody(element) {
  const clone = element.cloneNode(true);
  const originals = [element, ...element.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  const properties = ["font-family", "font-size", "font-weight", "color", "background-color", "border-collapse", "border-top", "border-right", "border-bottom", "border-left", "padding", "margin", "text-align", "vertical-align", "white-space", "line-height", "min-width", "max-width"];
  originals.forEach((node, index) => {
    const computed = window.getComputedStyle(node);
    copies[index].removeAttribute("class");
    copies[index].removeAttribute("data-coach");
    properties.forEach(property => copies[index].style.setProperty(property, computed.getPropertyValue(property)));
  });
  // Keep the original mail format independent of the on-screen glass theme.
  clone.style.cssText = "font-family:Arial,Malgun Gothic,sans-serif;font-size:14px;color:#000;background:#fff;";
  clone.querySelectorAll("*").forEach(node => {
    node.style.color = "#000";
    node.style.background = "transparent";
  });
  clone.querySelectorAll("h2").forEach(node => { node.style.color = "#00a2df"; });
  clone.querySelectorAll("table").forEach(node => {
    node.style.background = "#fff";
    node.style.borderCollapse = "collapse";
  });
  clone.querySelectorAll("th, td").forEach(node => {
    node.style.border = "1px solid #000";
  });
  clone.querySelectorAll("th").forEach(node => { node.style.background = "#cfe0ef"; });
  return { html: `<html><head><meta charset="utf-8"><meta name="color-scheme" content="light"></head><body style="color:#000000;background-color:#ffffff;">${clone.outerHTML}</body></html>`, text: element.innerText };
}

export async function copyOutputMailBody(element) {
  const {html,text}=buildOutputMailBody(element);
  if(navigator.clipboard?.write && typeof ClipboardItem!=="undefined") {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html":new Blob([html],{type:"text/html"}),
        "text/plain":new Blob([text],{type:"text/plain"}),
      })]);
      return;
    } catch { /* Older browsers / restricted clipboard APIs use the copy event. */ }
  }
  let copied=false;
  const onCopy=event=>{
    if(!event.clipboardData)return;
    event.clipboardData.setData("text/html",html);
    event.clipboardData.setData("text/plain",text);
    event.preventDefault();copied=true;
  };
  document.addEventListener("copy",onCopy);
  try {document.execCommand("copy");} finally {document.removeEventListener("copy",onCopy);}
  if(!copied)throw new Error("본문 복사에 실패했습니다. 브라우저의 클립보드 권한을 확인해주세요.");
}

export default function OutputMailButton({ outputRef, validate, hasRows, kind, date }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const prepare = async (openMail) => {
    if (busy || !validate()) return;
    if (!hasRows) {
      alert("메일로 보낼 일정이 없습니다. TimeBlock 입력 내용을 확인해주세요.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      await copyOutputMailBody(outputRef.current);
      setStatus("본문을 복사했습니다. Outlook 작성창에서 Ctrl+V로 붙여넣어주세요. 창이 열리지 않으면 브라우저의 앱 열기 확인창을 확인해주세요.");
      if (openMail) window.location.assign(buildOutputMailto(kind, date));
    } catch (error) {
      setStatus(error.name === "NotAllowedError" ? "본문 복사 권한이 없습니다. 브라우저의 클립보드 권한을 확인하고 다시 시도해주세요." : error.message || "본문을 복사하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    {status && <span role="status" className="output-mail-status">{status}</span>}
    {status && <button type="button" disabled={busy} onClick={() => prepare(false)}>본문 다시 복사</button>}
    {!status && <button type="button" disabled={busy} onClick={() => prepare(false)}>메일 본문 복사</button>}
    <button type="button" disabled={busy} onClick={() => prepare(true)}>{busy ? "본문 복사 중…" : "메일 전송"}</button>
  </>;
}

