// Based on PGMDR promotionDate / promotionReservationInput conventions.
const clean = value => String(value??"").normalize("NFKC").trim().replace(/[\u200b-\u200d\ufeff]/g,"");
const currentYear = () => Number(new Intl.DateTimeFormat("en",{year:"numeric",timeZone:"Asia/Seoul"}).format(new Date()));
const dateString = (year,month,day) => {
  const date=new Date(Date.UTC(year,month-1,day));
  if(year<1000||year>9999||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
};
export function normalizeDateInput(value,year=currentYear()) {
  let text=clean(value);if(!text)return "";
  // Excel's 1900 date-system serial, pasted as a numeric cell value.
  if(/^\d{5}(?:\.\d+)?$/.test(text)) {
    const date=new Date(Date.UTC(1899,11,30)+Math.floor(Number(text))*86400000);
    return dateString(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());
  }
  text=text.replace(/\s*\([^)]*\)\s*$/," ").trim().replace(/[년월]/g,"/").replace(/일$/," ").trim().replace(/[–—]/g,"-");
  let parts=text.split(/[-/.\s]+/).filter(Boolean);
  if(/^\d{8}$/.test(text))parts=[text.slice(0,4),text.slice(4,6),text.slice(6)];
  if(/^\d{6}$/.test(text))parts=[text.slice(0,2),text.slice(2,4),text.slice(4)];
  if(/^\d{4}$/.test(text))parts=[String(year),text.slice(0,2),text.slice(2)];
  if(parts.length===2)parts.unshift(String(year));
  if(parts.length!==3||parts.some(p=>!/^\d+$/.test(p)))return null;
  let [y,m,d]=parts.map(Number);if(parts[0].length<=2)y+=2000;
  return dateString(y,m,d);
}
export function normalizeTimeInput(value) {
  const text=clean(value);if(!text)return "";
  let parts=text.split(":");
  if(/^\d{1,2}$/.test(text))parts=[text,"0","0"];
  else if(/^\d{3,4}$/.test(text))parts=[text.slice(0,-2),text.slice(-2),"0"];
  else if(/^\d{6}$/.test(text))parts=[text.slice(0,2),text.slice(2,4),text.slice(4)];
  if(parts.length===2)parts.push("0");
  if(parts.length!==3||parts.some(p=>!/^\d{1,2}$/.test(p)))return null;
  const [h,m,s]=parts.map(Number);if(h>23||m>59||s>59)return null;
  return [h,m,s].map(p=>String(p).padStart(2,"0")).join(":");
}
export function normalizeDateTimeInput(value,year=currentYear()) {
  const text=clean(value);if(!text)return "";
  let dateText,timeText;
  if(/^\d{12}(?:\d{2})?$/.test(text)) {dateText=text.slice(0,8);timeText=text.slice(8);}
  else {
    const match=text.match(/^(.+?)[T\s]+(\d{1,6}(?::\d{1,2}){0,2})(?:\s*[~～].*)?$/);
    if(!match)return null;[,dateText,timeText]=match;
  }
  const date=normalizeDateInput(dateText,year),time=normalizeTimeInput(timeText);
  return date&&time?`${date} ${time}`:null;
}
