export const EXPORT_HEADERS = ["방송일자", "시작시간", "종료시간", "플로팅배너1", "플로팅배너2", "플로팅배너3", "플로팅배너4", "플로팅배너5"];
export const channelValue = row => String(row[0] ?? "").trim();
export function outputRows(rows, selectedChannels = null) {
  return rows.filter(row=>row.some(value=>String(value??"").trim()) && (selectedChannels === null || selectedChannels.includes(channelValue(row))));
}
export function exportValues(rows) {
  // The source has four floating-banner fields. No fifth banner is invented
  // from the notes column; the template's fifth slot stays empty.
  return rows.map(row=>[1,2,3,20,21,22,23,null].map(col=>col === null ? "" : String(row[col] ?? "")));
}

const u16 = (data, offset) => new DataView(data.buffer,data.byteOffset,data.byteLength).getUint16(offset,true);
const u32 = (data, offset) => new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(offset,true);
const put16 = (data, offset, value) => new DataView(data.buffer,data.byteOffset,data.byteLength).setUint16(offset,value,true);
const put32 = (data, offset, value) => new DataView(data.buffer,data.byteOffset,data.byteLength).setUint32(offset,value,true);
const join = arrays => { const result=new Uint8Array(arrays.reduce((sum,item)=>sum+item.length,0));let offset=0;arrays.forEach(item=>{result.set(item,offset);offset+=item.length;});return result; };
function record(type,payload) { const bytes=new Uint8Array(payload.length+4);put16(bytes,0,type);put16(bytes,2,payload.length);bytes.set(payload,4);return bytes; }
function records(bytes,start=0) {
  const result=[];
  for(let offset=start;offset+4<=bytes.length;) {
    const type=u16(bytes,offset), length=u16(bytes,offset+2);
    if(offset+4+length>bytes.length)throw new Error("양식 파일의 레코드가 손상되었습니다.");
    result.push({type,bytes:bytes.slice(offset,offset+length+4),payload:bytes.slice(offset+4,offset+length+4)});
    offset+=length+4;if(type===0x000a)break;
  }
  return result;
}
function textCell(row,col,xf,value) {
  const text=String(value??"");
  if(text.length>4000)throw new Error("한 셀에 4,000자를 넘는 내용이 있습니다.");
  const payload=new Uint8Array(9+text.length*2);
  put16(payload,0,row);put16(payload,2,col);put16(payload,4,xf);put16(payload,6,text.length);payload[8]=1;
  for(let i=0;i<text.length;i++)put16(payload,9+i*2,text.charCodeAt(i));
  return record(0x0204,payload); // BIFF8 LABEL: Unicode string, never NUMBER/RK/DATE.
}

export async function createBulkXls(template, rows) {
  if(rows.length>65535)throw new Error("XLS 형식은 최대 65,535개 데이터 행까지 내려받을 수 있습니다.");
  const imported=await import("cfb");const CFB=imported.default || imported;
  const container=CFB.read(new Uint8Array(template),{type:"array"});
  const stream=CFB.find(container,"Workbook") || CFB.find(container,"Book");
  if(!stream)throw new Error("XLS 양식의 Workbook을 찾을 수 없습니다.");
  const bytes=new Uint8Array(stream.content);
  const globals=records(bytes);
  const bounds=globals.filter(r=>r.type===0x0085);
  if(!bounds.length)throw new Error("양식에 시트가 없습니다.");
  const sheet=records(bytes,u32(bounds[0].payload,0));
  // Preserve all original font/XF records, header colors, borders, column widths,
  // page setup and margins. Replace data records instead of round-tripping styles.
  const xfs=globals.filter(r=>r.type===0x00e0);
  const xfFor=Array(8).fill(null);
  const headerRecords=[];
  sheet.forEach(r=>{
    if([0x00fd,0x0204,0x0201].includes(r.type) && r.payload.length>=6) {
      const row=u16(r.payload,0), col=u16(r.payload,2), xf=u16(r.payload,4);
      if(row===0)headerRecords.push(r.bytes);
      if(row===1 && col<8)xfFor[col]=xf;
    }
  });
  const textXf=xfs.findIndex(r=>u16(r.payload,2)===49); // Built-in @ text format.
  if(textXf<0)throw new Error("양식에 텍스트 셀 서식이 없습니다.");
  const body=exportValues(rows).flatMap((values,index)=>values.map((value,col)=>{
    const xf=xfFor[col]!==null && u16(xfs[xfFor[col]].payload,2)===49 ? xfFor[col] : textXf;
    return textCell(index+1,col,xf,value);
  }));
  const rowStyle=sheet.find(r=>r.type===0x0208 && u16(r.payload,0)===1)?.payload;
  const rowRecords=Array.from({length:rows.length+1},(_,row)=>{
    const original=sheet.find(r=>r.type===0x0208 && u16(r.payload,0)===0)?.payload;
    const payload=new Uint8Array((row===0?original:rowStyle)||16);
    put16(payload,0,row);put16(payload,2,0);put16(payload,4,8);
    return record(0x0208,payload);
  });
  const drop=new Set([0x0208,0x00fd,0x0204,0x0201,0x0203,0x027e,0x00bd,0x00be,0x0006,0x0207,0x0205,0x020b,0x00d7,0x003c]);
  const outputSheet=[];
  sheet.forEach(r=>{
    if(drop.has(r.type))return;
    if(r.type===0x0200) {
      const dim=new Uint8Array(14);put32(dim,0,0);put32(dim,4,rows.length+1);put16(dim,8,0);put16(dim,10,8);
      outputSheet.push(record(r.type,dim),...rowRecords,...headerRecords,...body);
    } else if(r.type===0x001d) {
      // Reset the selected cell/range to A1 after shrinking the template data.
      const selection=new Uint8Array(15);selection[0]=3;put16(selection,7,1);outputSheet.push(record(r.type,selection));
    } else outputSheet.push(r.bytes);
  });
  const outputGlobals=[];let keptSheet=false;let bound;
  globals.forEach(r=>{
    if(r.type===0x00ff)return; // EXTSST offsets are optional and would be stale.
    if(r.type===0x0085) { if(keptSheet)return;keptSheet=true;bound=r.bytes.slice();outputGlobals.push(bound); }
    else if(r.type===0x003d) { const b=r.bytes.slice();put16(b,14,0);put16(b,16,0);outputGlobals.push(b); }
    else outputGlobals.push(r.bytes);
  });
  put32(bound,4,outputGlobals.reduce((sum,r)=>sum+r.length,0));
  const workbook=join([...outputGlobals,...outputSheet]);
  CFB.utils.cfb_add(container,stream.name,workbook);
  return new Uint8Array(CFB.write(container,{type:"array"}));
}
