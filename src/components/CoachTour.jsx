import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ChiikawaHelper from "./ChiikawaHelper.jsx";
import { getMenuHelp, WORKFLOW_STEPS } from "../lib/tourContent.js";
import "../styles/tour-guide.css";

const TourContext=createContext(null);
// Existing screen-specific steps register with the single app-wide guide.
export default function CoachTour({steps}) {
  const context=useContext(TourContext);
  const register=context?.register;
  const page=context?.page;
  useEffect(()=>register?.(page,steps),[register,page,steps]);
  return null;
}

export function TourProvider({activePage,onNavigate,children}) {
  const [local,setLocal]=useState(null);
  const register=useCallback((page,steps)=>{
    const token={page,steps};setLocal(token);
    return ()=>setLocal(current=>current===token ? null : current);
  },[]);
  const [mode,setMode]=useState(null),[stepIndex,setStepIndex]=useState(0);
  const [helpSteps,setHelpSteps]=useState([]),[rect,setRect]=useState(null);
  const cardRef=useRef(null);
  const steps=mode==="workflow" ? WORKFLOW_STEPS : helpSteps;
  const step=steps[stepIndex];
  const open=Boolean(mode);
  const close=useCallback(()=>{
    setMode(null);setStepIndex(0);setRect(null);
    requestAnimationFrame(()=>document.querySelector(".chiikawa-wanderer")?.focus());
  },[]);
  const choose=kind=>{
    if(kind==="menu")setHelpSteps(getMenuHelp(activePage,local?.page===activePage ? local.steps : []));
    setStepIndex(0);setRect(null);setMode(kind);
  };
  useEffect(()=>{
    if(mode==="workflow" && step?.page && activePage!==step.page)onNavigate(step.page);
  },[mode,step,activePage,onNavigate]);

  useLayoutEffect(()=>{
    setRect(null);
    if(!open || mode==="chooser" || !step || (step.page && step.page!==activePage))return;
    let target,lastTarget,frame;
    const findTarget=()=>document.querySelector(step.target) || document.querySelector(step.fallbackTarget || ".page .empty-state, .page .topbar");
    const update=()=>{
      target=findTarget();
      if(!target || !target.getClientRects().length){setRect(null);return;}
      const box=target.getBoundingClientRect();
      const top=Math.max(8,box.top),left=Math.max(8,box.left);
      const right=Math.min(window.innerWidth-8,box.right),bottom=Math.min(window.innerHeight-8,box.bottom);
      if(right<=left || bottom<=top){setRect(null);return;}
      const next={top,left,width:Math.min(right-left,step.maxWidth ?? 620),height:Math.min(bottom-top,step.maxHeight ?? 180)};
      setRect(previous=>previous && Object.keys(next).every(key=>previous[key]===next[key]) ? previous : next);
    };
    const locate=()=>{
      const found=findTarget();
      if(found && found!==lastTarget){
        lastTarget=found;
        found.scrollIntoView({behavior:"instant",block:"nearest",inline:"nearest"});
      }
      cancelAnimationFrame(frame);frame=requestAnimationFrame(update);
    };
    locate();
    const observer=new MutationObserver(locate);
    observer.observe(document.querySelector(".app-shell") || document.body,{childList:true,subtree:true});
    window.addEventListener("resize",locate);window.addEventListener("scroll",update,true);
    return ()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener("resize",locate);window.removeEventListener("scroll",update,true);};
  },[mode,step,open,activePage]);
  useEffect(()=>{
    if(!open)return;
    const frame=requestAnimationFrame(()=>cardRef.current?.querySelector("button")?.focus());
    const keydown=event=>{
      if(event.key==="Escape"){event.preventDefault();close();}
      if(event.key==="Tab"){
        const buttons=Array.from(cardRef.current?.querySelectorAll("button:not(:disabled)") || []);
        if(!buttons.length)return;
        const first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey && (document.activeElement===first || !cardRef.current?.contains(document.activeElement))){event.preventDefault();last.focus();}
        else if(!event.shiftKey && (document.activeElement===last || !cardRef.current?.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    window.addEventListener("keydown",keydown);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener("keydown",keydown);};
  },[open,mode,stepIndex,close]);
  const cardWidth=Math.min(370,window.innerWidth-24);
  const cardHeight=Math.min(300,window.innerHeight-24);
  let position={left:Math.max(12,(window.innerWidth-cardWidth)/2),top:Math.max(12,(window.innerHeight-cardHeight)/2)};
  if(rect && mode!=="chooser") {
    const right=rect.left+rect.width+18;
    const top=rect.top+rect.height+18;
    position=right+cardWidth<window.innerWidth-12 ? {left:right,top:Math.max(12,Math.min(rect.top,window.innerHeight-cardHeight-12))} :
      {left:Math.max(12,Math.min(rect.left,window.innerWidth-cardWidth-12)),top:top+cardHeight<window.innerHeight ? top : Math.max(12,rect.top-cardHeight-18)};
  }
  return <TourContext.Provider value={{register,page:activePage}}>{children}
    <ChiikawaHelper paused={open} onClick={()=>{setMode("chooser");setStepIndex(0);setRect(null);}} />
    {open && createPortal(<div className="tour-layer app-tour-layer" role="dialog" aria-modal="true" aria-label={mode==="chooser" ? "치이카와 안내 선택" : mode==="workflow" ? "업무 플로우 안내" : "현재 메뉴 도움말"}>
      <div className="tour-backdrop" onClick={close} />
      {rect && mode!=="chooser" && <div className="tour-highlight" style={{top:rect.top-4,left:rect.left-4,width:rect.width+8,height:rect.height+8}} />}
      <div className="tour-card app-tour-card" ref={cardRef} style={{...position,width:cardWidth}}>
        {mode==="chooser" ? <>
          <div className="tour-chooser-heading"><strong>치이카와 안내</strong><button type="button" onClick={close} aria-label="안내 선택 닫기">×</button></div>
          <button type="button" className="tour-mode-choice" onClick={()=>choose("workflow")}><strong>1. 업무 플로우 안내</strong><span>TimeBlock 입력부터 운행표 저장까지 화면을 이동하며 단계별로 안내합니다.</span></button>
          <button type="button" className="tour-mode-choice" onClick={()=>choose("menu")}><strong>2. 현재 메뉴 도움말</strong><span>지금 열려 있는 메뉴의 입력·검색·저장 기능을 하나씩 짚어드립니다.</span></button>
          <small>각 단계에서 설명하는 부분을 하이라이트합니다.</small>
        </> : <>
          <div className="tour-count">{mode==="workflow" ? "업무 플로우" : "현재 메뉴 도움말"} · {stepIndex+1} / {steps.length}</div>
          <strong>{step?.title}</strong><p>{step?.description}</p>
          <div className="tour-actions"><button type="button" onClick={()=>{setRect(null);setMode("chooser");}}>안내 선택</button><button type="button" onClick={close}>닫기</button><button type="button" disabled={stepIndex===0} onClick={()=>setStepIndex(index=>index-1)}>이전</button><button type="button" onClick={()=>stepIndex>=steps.length-1 ? close() : setStepIndex(index=>index+1)}>{stepIndex>=steps.length-1 ? "완료" : "다음"}</button></div>
        </>}
      </div>
    </div>,document.body)}
  </TourContext.Provider>;
}
