import { ref, runTransaction, serverTimestamp } from "firebase/database";
import { database } from "../src/lib/firebase.js";
import { initialMemos } from "../src/lib/initialMemos.js";

const timeout = setTimeout(()=>{console.error("DB 연결 시간 초과");process.exit(1);},20000);
try {
  for(const [collection,defaults] of [["memos",initialMemos],["broadcastQa",[]]]) {
    await runTransaction(ref(database,`workspace/${collection}`),current=>current ?? {
      schemaVersion:1,createdAt:serverTimestamp(),
      items:Object.fromEntries(defaults.map((item,index)=>[`initial-${index+1}`,{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}])),
    },{applyLocally:false});
    console.log(`workspace/${collection} 준비 완료 (기존 데이터 유지)`);
  }
  clearTimeout(timeout);process.exit(0);
} catch(error) {clearTimeout(timeout);console.error(error.code || error.message);process.exit(1);}
