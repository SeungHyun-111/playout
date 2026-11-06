import {useCallback,useEffect,useRef,useState} from 'react';
import {onValue,ref,runTransaction,serverTimestamp,update} from 'firebase/database';
import {database} from '../lib/firebase.js';
import {CONFLICT_SESSION_ROOT,CONFLICT_SOURCES,decisionRecord,decisionKey,restoreDecisions,decisionUpdates,decisionSourceRows} from '../lib/conflictSession.js';
function defaults(){
  const month=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}).slice(0,7);
  const last=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
  return {period:{start:`${month}-01`,end:`${month}-${last}`},socket:0,detailsOpen:true,selectedBar:null,table:{mode:'period',showNames:false,sort:{key:'type',direction:'desc'}}};
}
export default function useMaterialConflictSession(settings){
  const [state,setState]=useState(()=>({ui:defaults(),choices:{}}));
  const current=useRef(state),sessionPath=useRef(null),alive=useRef(true),pending=useRef(0);
  const settingsRef=useRef(settings);settingsRef.current=settings;
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[connected,setConnected]=useState(false);
  useEffect(()=>{
    alive.current=true;
    let active=true,unsubscribe;
    const disconnect=onValue(ref(database,'.info/connected'),snapshot=>{if(alive.current)setConnected(snapshot.val()===true);});
    const prepare=async()=>{
      const root=await runTransaction(ref(database,CONFLICT_SESSION_ROOT),value=>value??{schemaVersion:1,activeSessionId:'shared',sources:CONFLICT_SOURCES,createdAt:serverTimestamp()},{applyLocally:false});
      if(!active)return;
      const id=root.snapshot.val().activeSessionId||'shared';
      const path=`${CONFLICT_SESSION_ROOT}/sessions/${id}`;
      let legacy={};
      try{legacy=JSON.parse(sessionStorage.getItem('playout.materialConflicts.outputChoices')||'{}');}catch{/* No legacy state. */}
      const decisions={};
      if(legacy&&typeof legacy==='object'&&!Array.isArray(legacy))Object.entries(legacy).forEach(([pairId,choice])=>{
        try{decisions[decisionKey(pairId)]=decisionRecord(pairId,choice,serverTimestamp());}catch{/* Skip obsolete pre-pair selection keys. */}
      });
      await runTransaction(ref(database,path),value=>value??{schemaVersion:1,id,kind:'banner-conflict-review',sources:CONFLICT_SOURCES,ui:defaults(),decisions,createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{applyLocally:false});
      if(!active)return;
      // Import this tab's prior selections only when no cloud decision exists.
      // Another tab may have created the shared session before this tab opened.
      await Promise.all(Object.entries(decisions).map(([key,record])=>runTransaction(ref(database,`${path}/decisions/${key}`),value=>value??record,{applyLocally:false})));
      if(!active)return;
      sessionPath.current=path;
      unsubscribe=onValue(ref(database,path),snapshot=>{
        if(!active)return;
        const saved=snapshot.val()||{},base=defaults();
        const next={ui:{...base,...saved.ui,table:{...base.table,...saved.ui?.table}},choices:restoreDecisions(saved.decisions)};
        current.current=next;setState(next);setLoading(false);setError('');
      },()=>{if(active){setLoading(false);setError('RTDB 작업 세션을 읽지 못했습니다. DB 연결과 권한을 확인해주세요.');}});
    };
    prepare().catch(()=>{if(active){setLoading(false);setError('RTDB 작업 세션을 준비하지 못했습니다. 새로고침 후 다시 시도해주세요.');}});
    return()=>{active=false;alive.current=false;unsubscribe?.();disconnect();sessionPath.current=null;};
  },[]);
  const persist=useCallback(updates=>{
    if(!sessionPath.current){setError('작업 세션 연결 전에는 저장할 수 없습니다.');return;}
    pending.current++;setSaving(true);setError('');
    update(ref(database,sessionPath.current),{...updates,updatedAt:serverTimestamp()}).catch(()=>{
      if(alive.current)setError('RTDB 저장에 실패했습니다. 변경 사항이 서버에 저장되지 않았습니다.');
    }).finally(()=>{pending.current--;if(alive.current)setSaving(pending.current>0);});
  },[]);
  const setUi=useCallback((field,value)=>{
    const previous=current.current;
    const nextValue=typeof value==='function'?value(previous.ui[field]):value;
    if(JSON.stringify(previous.ui[field])===JSON.stringify(nextValue))return;
    const next={...previous,ui:{...previous.ui,[field]:nextValue}};
    const patches={};
    if(['period','table'].includes(field)){
      Object.entries(nextValue).forEach(([key,entry])=>{if(JSON.stringify(previous.ui[field]?.[key])!==JSON.stringify(entry))patches[`ui/${field}/${key}`]=entry??null;});
    }else patches[`ui/${field}`]=nextValue??null;
    current.current=next;setState(next);persist(patches);
  },[persist]);
  const setChoices=useCallback(value=>{
    const previous=current.current;
    const choices=typeof value==='function'?value(previous.choices):value;
    const updates=decisionUpdates(previous.choices,choices,serverTimestamp());
    Object.values(updates).forEach(record=>{record.relatedRows=decisionSourceRows(record.pairId,settingsRef.current);});
    if(!Object.keys(updates).length)return;
    const next={...previous,choices};current.current=next;setState(next);persist(updates);
  },[persist]);
  return {ui:state.ui,choices:state.choices,setUi,setChoices,loading,error,saving,connected};
}
