import { useEffect, useRef, useState } from "react";

export default function useNewItemMarker(items) {
  const [cue,setCue]=useState(null);
  const [marks,setMarks]=useState({});
  const newId=cue?.id;
  const markChange=(id,kind="edited")=>{
    setMarks(current=>({...current,[id]:kind}));
    if(kind!=="edited")setCue({id,kind});
  };
  const markNew=id=>markChange(id,"new");
  const elements=useRef(new Map());
  const exists=items.some(item=>item.id===newId);
  useEffect(()=>{
    if(!newId || !exists)return;
    const element=elements.current.get(newId);
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element?.scrollIntoView({behavior:reduced ? "instant" : "smooth",block:"nearest"});
    if(cue.kind==="new")element?.querySelector("input, select")?.focus({preventScroll:true});
  },[cue,exists]);
  const register=id=>element=>{
    if(element)elements.current.set(id,element);else elements.current.delete(id);
  };
  return {newId,markNew,markChange,marks,register};
}
