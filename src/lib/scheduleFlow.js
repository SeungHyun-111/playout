export const BULK_HEADERS = ["채널", "방송일자", "시작시간", "종료시간", "영상코드", "메모코드명", "MD분류", "편성코드명", "소재ID", "상품코드", "PGM명", "카드제외 여부", "특이사항1", "특이사항2", "프로모션 여부", "스케쳐스/정호영/이종임\nCI 0F001375", "메모코드", "PGM명", "특이사항3", "특이사항4", "플로팅배너1", "플로팅배너2", "플로팅배너3", "플로팅배너4", "비고"];
export const MASTER_HEADERS = ["No", "방송일자", "시작시간", "방송시간(분)", "광고시간(초)", "종료시간", "소재ID", "다원방송", "프로그램코드", "프로그램명", "편성코드", "편성코드명", "제작프로그램명", "카테고리명", "MD분류명", "배너소재", "배너시간", "배너소재2", "배너시간", "배너소재3", "배너시간", "배너소재4", "배너시간", "배너소재5"];
const text = value => String(value ?? "").trim();
const list = value => Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {}).filter(Boolean);
export const dateKey = value => { const m = text(value).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}` : ""; };
export const timeKey = value => { const m = text(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/); return m ? `${m[1].padStart(2,"0")}:${m[2]}:${m[3] || "00"}` : ""; };
const seconds = value => { const t = timeKey(value); return t ? t.split(":").reduce((a,b)=>a*60+Number(b),0) : null; };
const clock = value => { const s = ((value % 86400) + 86400) % 86400; return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,"0")).join(":"); };
const dateTime = value => { const d=dateKey(value),t=timeKey(value); return d && t ? `${d} ${t}` : ""; };
const range = (row,date) => Boolean(date && (dateKey(row.startDate) || dateKey(row.endDate)) && (!row.startDate || date >= dateKey(row.startDate)) && (!row.endDate || date <= dateKey(row.endDate)));
const priority = ["specialRequest","promotion","plannedPgm","eventCard","captionRequest"];
const idFor = value => Array.from(new TextEncoder().encode(value), n=>n.toString(16).padStart(2,"0")).join("");

export function buildBulk(headers, rows, settings = {}, edits = {}) {
  const names = headers.map(text);
  const occurrences = new Map();
  return rows.filter(row=>row?.some(value=>text(value))).map(source => {
    const get = name => text(source[names.indexOf(name)]);
    const date = dateKey(get("방송일자"));
    const times = get("방송시간").split(/~|～/);
    const start = timeKey(get("시작시간") || times[0]);
    const end = timeKey(get("종료시간") || times[1]);
    const pgm = get("PGM명"), name = get("편성코드명"), code=get("편성코드"), md=get("MD분류");
    const identity = JSON.stringify([date,start,get("채널"),code,get("소재ID"),get("상품코드")]);
    const occurrence = occurrences.get(identity) || 0; occurrences.set(identity, occurrence+1);
    const id = idFor(`${identity}:${occurrence}`);
    const out = BULK_HEADERS.map(()=>"");
    [get("채널"),date.replaceAll("-","/"),start,end,get("영상코드"),get("MD팀"),md,name,get("소재ID"),get("상품코드"),pgm].forEach((v,i)=>out[i]=v);
    const memoNames = names.flatMap((n,i)=>n==="메모코드명" ? [text(source[i])] : []).filter(Boolean);
    out[12]=memoNames[0] || ""; out[13]=memoNames[1] || "";
    out[16]=get("메모코드") || get("메모1");
    const excluded = list(settings.disabledMdCategories).some(row=>text(row.mdCategory) && text(row.mdCategory)===md);
    const cardExcluded = ["N","X","미운영","제외","아니오"].includes(get("PGM배너여부"));
    out[11] = cardExcluded ? "O" : "";
    const card = list(settings.bannerSchedules).find(row=>range(row,date));
    const defaults = list(settings.defaultMaterials).find(row=>text(row.materialType)===(excluded?"무형":"유형"));
    let materials = [1,2,3,4].map(i=>text(defaults?.[`material${i}`]));
    materials[0] = excluded ? "" : card?.materialId || "";
    const promotion = list(settings.promotion).find(row=>range(row,date) && list(row.programNames).some(p=>text(p.value) && [name,code].includes(text(p.value))));
    const planned = list(settings.plannedPgm).find(row=>text(row.plannedPgmName) && text(row.plannedPgmName)===pgm && range(row,date));
    const stamp = date && start ? `${date} ${start}` : "";
    const special = list(settings.specialRequests).find(row=>stamp && dateTime(row.pgmDateTime)===stamp && text(row.programName) && [name,code].includes(text(row.programName)));
    const caption = list(settings.captionRequests).find(row=>stamp && dateTime(row.scheduleDateTime)===stamp);
    const sources = { specialRequest:special, promotion, plannedPgm:planned, eventCard:card ? {material1:card.materialId} : null,
      captionRequest: caption?.materialId ? { [({"카드배너":"material1","CI배너":"material2","L바":"material3","스크롤":"material4"})[list(settings.bannerMaterials).find(b=>b.materialId===caption.materialId)?.positionType] || "material4"]:caption.materialId } : null };
    const order = [...new Set([...list(settings.priorityOrder).filter(p=>priority.includes(p)),...priority])];
    // Highest priority is applied last; a special request owns all four slots,
    // including explicit empty values.
    [...order].reverse().forEach(key=>{
      const rule=sources[key]; if(!rule) return;
      materials=materials.map((v,i)=> key==="specialRequest" ? text(rule[`material${i+1}`]) : text(rule[`material${i+1}`]) || v);
    });
    if(cardExcluded) materials[0]="";
    materials=materials.map(v=>["미운영","행사카드"].includes(v)?"":v);
    materials.forEach((v,i)=>out[20+i]=v);
    out[14]=promotion?"O":"";
    out[24]=text(special?.note || promotion?.note || planned?.note);
    Object.entries(edits.overrides?.[id] || {}).forEach(([col,value])=>{out[Number(col)]=value;});
    return {id,values:out,meta:{code,videoName:get("영상명"),category:get("카테고리명"),programCode:get("프로그램코드"),duration:get("노출")}};
  }).concat(list(edits.extraRows).map(row=>({...row,values:BULK_HEADERS.map((_,i)=>row.values?.[i] ?? ""),meta:{}})));
}

export function buildMaster(records, settings = {}) {
  const programs = records.filter(r=>r.values.some(v=>text(v))).map((record,index)=>({record,index,date:dateKey(record.values[1]),start:seconds(record.values[2])}));
  const insertions = new Map();
  list(settings.advertisements).forEach(rule=>{
    if(!timeKey(rule.startTime))return;
    const hour=timeKey(rule.startTime).slice(0,2);
    const catalog=list(settings.advertisementCatalog).find(ad=>text(ad.material) && text(ad.material)===text(rule.material));
    const material=text(rule.material), name=text(rule.materialName || catalog?.materialName), duration=text(rule.durationSeconds ?? "") || text(catalog?.durationSeconds);
    if(!material && !name)return;
    const dates=[...new Set(programs.map(p=>p.date).filter(Boolean))];
    dates.forEach(date=>{
      const first=programs.filter(p=>p.date===date && p.start!==null && timeKey(p.record.values[2]).slice(0,2)===hour).sort((a,b)=>a.start-b.start || a.index-b.index)[0];
      if(!first)return;
      const ad=MASTER_HEADERS.map(()=>"");
      ad[1]=date.replaceAll("-","/"); ad[2]=clock(first.start); ad[4]=duration;
      ad[5]=duration!=="" && Number.isFinite(Number(duration)) && Number(duration)>=0 ? clock(first.start+Number(duration)) : "";
      ad[6]=material; ad[7]="N"; ad[12]=name;
      insertions.set(first.index,[...(insertions.get(first.index)||[]),ad]);
    });
  });
  const output=[];
  programs.forEach(({record,index})=>{
    output.push(...(insertions.get(index)||[]));
    const v=record.values,m=record.meta||{},out=MASTER_HEADERS.map(()=>"");
    out[1]=v[1];out[2]=v[2];out[5]=v[3];out[6]=v[8];
    const start=seconds(v[2]),end=seconds(v[3]);
    out[3]=start!==null && end!==null ? String(((end-start+86400)%86400)/60) : "";
    out[7]=text(v[0]) ? (text(v[0]).replace(/\s/g,"") === "전체" ? "N" : "Y") : "";
    out[8]=m.programCode || "";out[9]=v[10];out[10]=m.code||"";out[11]=v[7];out[12]=m.videoName||"";out[13]=m.category||"";out[14]=v[6];
    [20,21,22,23].forEach((col,i)=>{out[15+i*2]=v[col];});
    output.push(out);
  });
  return output.map((row,i)=>row.map((v,c)=>c===0?String(i+1):v??""));
}
