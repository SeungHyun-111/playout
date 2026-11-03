import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../lib/firebase.js";

export default function useScheduleSettings() {
  const [settings,setSettings]=useState({});
  const [error,setError]=useState("");
  useEffect(()=>onValue(ref(database,"settings"),snapshot=>{setSettings(snapshot.val()||{});setError("");},()=>setError("운영·광고 설정을 불러오지 못했습니다. 연결과 DB 권한을 확인해주세요.")),[]);
  return {settings,error};
}
