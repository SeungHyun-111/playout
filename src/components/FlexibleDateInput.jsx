import { useEffect, useRef, useState } from "react";
import { normalizeDateInput, normalizeDateTimeInput, normalizeTimeInput } from "../lib/flexibleDate.js";

export default function FlexibleDateInput({ value="", onChange, kind="date", label, onFocus, onPaste, year, shortDate=false }) {
  const display=value=>shortDate && /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value).slice(5).split("-").map(Number).join("/") : String(value??"");
  const [draft,setDraft]=useState(String(value??""));
  const [invalid,setInvalid]=useState(false);
  const focused=useRef(false);
  const normalize=text=>kind==="datetime"?normalizeDateTimeInput(text,year):kind==="time"?normalizeTimeInput(text):normalizeDateInput(text,year);
  const hint=kind==="datetime"?"예: 11/3 2331, 202611032331":kind==="time"?"예: 1, 0131, 01:31:00":"예: 20261103, 26/11/3, 11.3";
  useEffect(()=>{if(!focused.current){setDraft(display(value));setInvalid(Boolean(value && normalize(value)===null));}},[value,kind,year,shortDate]);
  const commit=text=>{
    const result=normalize(text);
    if(result===null){setInvalid(true);return;}
    setDraft(display(result));setInvalid(false);onChange(result);
  };
  return <input className="flexible-date-input" type="text" aria-label={label} aria-invalid={invalid || undefined} autoComplete="off" spellCheck={false} value={draft} placeholder={hint} title={invalid?`날짜/시간을 확인해주세요. ${hint}`:hint}
    onFocus={event=>{focused.current=true;onFocus?.(event);}}
    onChange={event=>{setDraft(event.target.value);setInvalid(false);}}
    onBlur={()=>{focused.current=false;commit(draft);}}
    onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();event.currentTarget.blur();}if(event.key==="Escape"){setDraft(String(value??""));setInvalid(false);}}}
    onPaste={event=>{
      const text=event.clipboardData.getData("text/plain");
      if(text.includes("\t") || text.trim().includes("\n")) {
        if(kind==="datetime" && normalize(text)!==null){event.preventDefault();commit(text);}
        else onPaste?.(event);
      } else if(normalize(text)!==null){event.preventDefault();commit(text);}
    }} />;
}
