import { useEffect, useState } from "react";
import { onValue, push, ref, remove, runTransaction, serverTimestamp, set } from "firebase/database";
import { database } from "../lib/firebase.js";

export default function useWorkspaceRecords(collection, defaults = []) {
  const [records,setRecords] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(()=>{
    let active = true, unsubscribe;
    setLoading(true);setError("");setRecords([]);
    const root = ref(database,`workspace/${collection}`);
    // A schema marker prevents deleted initial memos from being seeded again.
    runTransaction(root,current=>current ?? {
      schemaVersion:1,createdAt:serverTimestamp(),
      items:Object.fromEntries(defaults.map((item,index)=>[`initial-${index+1}`,{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}])),
    },{applyLocally:false}).then(()=>{
      if (!active) return;
      unsubscribe = onValue(ref(database,`workspace/${collection}/items`),snapshot=>{
        setRecords(Object.entries(snapshot.val() || {}).map(([id,item])=>({...item,id})).sort((a,b)=>(b.updatedAt || 0)-(a.updatedAt || 0)));
        setLoading(false);setError("");
      },()=>{setError("목록을 불러오지 못했습니다. DB 연결과 읽기 권한을 확인해주세요.");setLoading(false);});
    }).catch(()=>{
      if(active){setError("DB를 준비하지 못했습니다. 연결과 읽기·쓰기 권한을 확인해주세요.");setLoading(false);}
    });
    return ()=>{active=false;unsubscribe?.();};
  },[collection,defaults]);
  const save = async (id,fields) => {
    if(id) {
      const result = await runTransaction(ref(database,`workspace/${collection}/items/${id}`),current=>current ? {...current,...fields,updatedAt:serverTimestamp()} : undefined,{applyLocally:false});
      if(!result.committed) throw new Error("이미 삭제된 항목입니다.");
    }
    else await set(push(ref(database,`workspace/${collection}/items`)),{...fields,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  };
  const erase = id => remove(ref(database,`workspace/${collection}/items/${id}`));
  return {records,loading,error,save,erase};
}
