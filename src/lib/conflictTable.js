import { dayNumber } from "./materialConflicts.js";
export const benefitFields=[['shoppingSubsidy','쇼핑지원금'],['rewardPoints','적립금'],['cardBillingDiscount','카드청구할인'],['otherBenefits','기타']];
export const conflictTableColumns=[['type','구분'],['name','프로모션 / PGM명'],['period','기간'],...[1,2,3,4,5].map(i=>[`material${i}`,`소재${i}`]),...benefitFields];
const collator=new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
export function materialNames(settings) {
  return Object.fromEntries(Object.values(settings.bannerMaterials||{}).filter(Boolean).filter(row=>row.materialId&&row.materialName).map(row=>[String(row.materialId).trim(),String(row.materialName).trim()]));
}
export function tableMaterial(code,names,showNames) { return showNames?(names[code]||code):code; }
export function sortConflictRows(rows,sort,names={},showNames=false) {
  const value=(row,key)=>key.startsWith('material')?tableMaterial(row.materials[Number(key.slice(8))-1]||'',names,showNames):row[key]||'';
  return [...rows].sort((a,b)=>{
    const compared=sort.key==='period'?dayNumber(a.start)-dayNumber(b.start)||dayNumber(a.end)-dayNumber(b.end):collator.compare(value(a,sort.key),value(b,sort.key));
    return compared*(sort.direction==='asc'?1:-1)||collator.compare(a.id,b.id);
  });
}
export async function createConflictWorkbook({mode,groups,rows,names,showNames}) {
  const module=await import('exceljs');
  const ExcelJS=module.default||module;
  const workbook=new ExcelJS.Workbook();
  const sheet=workbook.addWorksheet(mode==='period'?'기간별 통합 목록':'일괄 통합 목록');
  const columns=[...(mode==='period'?[['groupStart','구간 시작일'],['groupEnd','구간 종료일']]:[]),['type','구분'],['name','프로모션 / PGM명'],['start','시작일'],['end','종료일'],...[1,2,3,4,5].map(i=>[`material${i}`,`소재${i}`]),...benefitFields];
  sheet.columns=columns.map(([key,header])=>({key,header,width:key==='name'?26:key.startsWith('material')?(showNames?32:16):key==='type'?13:18}));
  const append=(row,group)=>{
    const values={...row,start:new Date(`${row.start}T00:00:00Z`),end:new Date(`${row.end}T00:00:00Z`)};
    if(group){values.groupStart=new Date(`${group.start}T00:00:00Z`);values.groupEnd=new Date(`${group.end}T00:00:00Z`);}
    row.materials.forEach((code,i)=>values[`material${i+1}`]=tableMaterial(code,names,showNames));
    const added=sheet.addRow(values);
    added.height=30;
    added.eachCell({includeEmpty:true},(cell,index)=>{
      const key=columns[index-1][0];
      const populated=cell.value!==null&&cell.value!==undefined&&String(cell.value)!=='';
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:populated?'FFE1EFFB':'FFF0F2F5'}};
      cell.font={name:'맑은 고딕',size:10,color:{argb:populated?'FF203C58':'FF91A0AE'}};
      cell.alignment={vertical:'middle',wrapText:true};
      cell.border={bottom:{style:'thin',color:{argb:'FFD3DDE7'}}};
      cell.numFmt=['start','end','groupStart','groupEnd'].includes(key)?'yyyy-mm-dd':'@';
    });
  };
  if(mode==='period')groups.forEach(group=>{
    const first=sheet.rowCount+1;
    group.rows.forEach(row=>append(row,group));
    if(group.rows.length>1){sheet.mergeCells(first,1,sheet.rowCount,1);sheet.mergeCells(first,2,sheet.rowCount,2);}
  });else rows.forEach(row=>append(row));
  sheet.getRow(1).height=28;
  sheet.getRow(1).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2D506F'}};cell.font={name:'맑은 고딕',bold:true,color:{argb:'FFFFFFFF'}};cell.alignment={vertical:'middle',horizontal:'center'};});
  sheet.views=[{state:'frozen',ySplit:1,xSplit:mode==='period'?2:0}];
  if(mode!=='period')sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:columns.length}};
  const guide=workbook.addWorksheet('보기 안내');
  guide.addRows([['보기',mode==='period'?'기간별':'일괄'],['소재 표시',showNames?'소재명 (이름이 없으면 ID)':'ID'],['셀 색상','파란색: 값 있음 / 회색: 공란'],['기간','시작일·종료일은 Excel 날짜 형식'],['선택 결과','본 목록은 설정 조회용이며 충돌별 선택 결과는 포함하지 않음']]);
  guide.columns=[{width:20},{width:75}];
  return workbook;
}
