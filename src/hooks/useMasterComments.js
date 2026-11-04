import { useEffect, useRef, useState } from "react";
import { onValue, ref, set } from "firebase/database";
import { database } from "../lib/firebase.js";

export default function useMasterComments() {
  const [comments,setComments]=useState({}),[loaded,setLoaded]=useState(false),[error,setError]=useState("");
  const pending=useRef(new Map());
  useEffect(()=>onValue(ref(database,"masterSchedule/comments"),snapshot=>{
    const next=snapshot.val() || {};
    pending.current.forEach((entry,key)=>{next[key]=entry.value;});
    setComments(next);setLoaded(true);
  },()=>{setLoaded(false);setError("편성팀 코멘트를 불러오지 못했습니다. DB 연결과 권한을 확인해주세요.");}),[]);
  const setComment=(key,value)=>{
    if(!loaded)return;
    const entry={value};pending.current.set(key,entry);
    setComments(current=>({...current,[key]:value}));setError("");
    entry.promise=set(ref(database,`masterSchedule/comments/${key}`),value || null)
      .then(()=>{if(pending.current.get(key)===entry)pending.current.delete(key);})
      .catch(failure=>{setError("코멘트 자동 저장에 실패했습니다. 입력 내용은 유지됩니다. 연결과 DB 권한을 확인해주세요.");throw failure;});
    // Keep failures visible without unhandled promise rejections on typing.
    entry.promise.catch(()=>{});
  };
  return {comments,setComment,loaded,error};
}
