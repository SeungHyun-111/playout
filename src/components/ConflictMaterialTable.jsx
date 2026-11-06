import {useMemo,useState} from 'react';
import {analyzeMaterials,dayNumber} from '../lib/materialConflicts.js';
import {benefitFields,conflictTableColumns,materialNames,tableMaterial,sortConflictRows,createConflictWorkbook} from '../lib/conflictTable.js';
export default function ConflictMaterialTable({rows,periodGroups,period,socket,settings,onNavigate}) {
  const [mode,setMode]=useState('period'),[showNames,setShowNames]=useState(false),[sort,setSort]=useState({key:'type',direction:'desc'}),[exporting,setExporting]=useState(false),[error,setError]=useState('');
  const names=useMemo(()=>materialNames(settings),[settings]);
  const allRows=useMemo(()=>analyzeMaterials(rows,period.start,period.end,socket).rows,[rows,period,socket]);
  const sortedRows=useMemo(()=>sortConflictRows(allRows,sort,names,showNames),[allRows,sort,names,showNames]);
  const groups=useMemo(()=>periodGroups.filter(group=>group.rows.length).map(group=>({...group,rows:sortConflictRows(group.rows,sort,names,showNames)})).sort((a,b)=>(dayNumber(a.start)-dayNumber(b.start))*(sort.key==='period'&&sort.direction==='desc'?-1:1)),[periodGroups,sort,names,showNames]);
  const sortBy=key=>setSort(previous=>({key,direction:previous.key===key&&previous.direction==='asc'?'desc':'asc'}));
  const exportVersion=async version=>{
    setExporting(true);setError('');
    try {
      const workbook=await createConflictWorkbook({mode:version,groups,rows:sortedRows,names,showNames});
      const buffer=await workbook.xlsx.writeBuffer();
      const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download=`프로모션_PGM_${version==='period'?'기간별':'일괄'}_${showNames?'소재명':'ID'}_${period.start}_${period.end}.xlsx`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setError('엑셀 생성에 실패했습니다. 다시 시도해주세요.');}finally{setExporting(false);}
  };
  const renderRow=(row,group,index)=> <tr key={`${group?.start||'all'}-${row.id}`} className={group&&index===0?'mc-group-start':''}>
    {group&&index===0&&<td rowSpan={group.rows.length} className="mc-period-merged"><strong><time dateTime={group.start}>{group.start}</time></strong><span>~ <time dateTime={group.end}>{group.end}</time></span><small>{group.rows.length}개 항목 · {dayNumber(group.end)-dayNumber(group.start)+1}일</small></td>}
    <td><span className={`mc-type ${row.type==='PGM'?'pgm':''}`}>{row.type}</span></td><td><button className="mc-name-link" onClick={()=>onNavigate('settings-promotion')}>{row.name}</button></td>
    <td className="mc-period-cell"><time dateTime={row.start}>{row.start}</time> ~ <time dateTime={row.end}>{row.end==='9999-12-31'?'상시':row.end}</time></td>
    {row.materials.map((code,i)=><td key={i} className={`${code?'mc-cell-filled':'mc-cell-empty'} ${socket===i+1?'mc-active-column':''}`} title={code?`${code}${names[code]?` · ${names[code]}`:''}`:undefined}>{code?<span className={`mc-material-code ${showNames?'is-material-name':''}`}>{tableMaterial(code,names,showNames)}</span>:<span className="mc-empty-dash">—</span>}</td>)}
    {benefitFields.map(([key])=><td key={key} className={row[key]?'mc-cell-filled':'mc-cell-empty'}>{row[key]||<span className="mc-empty-dash">—</span>}</td>)}
  </tr>;
  const empty=mode==='period'?!groups.length:!sortedRows.length;
  return <section className="mc-panel mc-list-panel"><div className="mc-panel-heading"><h2>프로모션 + PGM 통합 목록</h2><div className="mc-list-controls"><div className="mc-view-tabs" aria-label="통합 목록 보기">{[['period','기간별 보기'],['all','일괄 보기']].map(([value,label])=><button key={value} aria-pressed={mode===value} className={mode===value?'selected':''} onClick={()=>setMode(value)}>{label}</button>)}</div><label className="mc-name-toggle"><input type="checkbox" checked={showNames} onChange={event=>setShowNames(event.target.checked)}/>소재명으로 보기 <span>{showNames?'소재명':'ID'}</span></label><button className="mc-export" disabled={exporting||!groups.length} onClick={()=>exportVersion('period')}>↓ 기간별 엑셀</button><button className="mc-export" disabled={exporting||!sortedRows.length} onClick={()=>exportVersion('all')}>↓ 일괄 엑셀</button></div></div>
    <p className="mc-caption">{mode==='period'?'충돌 항목을 기간별로 묶어 표시합니다. 열 제목을 누르면 묶음 안에서 정렬합니다.':'선택 기간의 전체 등록 항목을 한 번씩 표시합니다. 열 제목을 누르면 전체 목록을 정렬합니다.'} 기간은 시작일 → 종료일 순으로 정렬합니다.</p>
    {error&&<div className="mc-notice" role="alert">{error}</div>}
    <div className="mc-table-scroll"><table className="mc-table mc-sortable-table"><thead><tr>{mode==='period'&&<th aria-sort={sort.key==='period'?(sort.direction==='asc'?'ascending':'descending'):'none'}><button onClick={()=>sortBy('period')}>기간 구분 {sort.key==='period'?(sort.direction==='asc'?'↑':'↓'):'↕'}</button></th>}{conflictTableColumns.map(([key,label])=><th key={key} aria-sort={sort.key===key?(sort.direction==='asc'?'ascending':'descending'):'none'}><button onClick={()=>sortBy(key)}>{label} <span>{sort.key===key?(sort.direction==='asc'?'↑':'↓'):'↕'}</span></button></th>)}</tr></thead><tbody>{mode==='period'?groups.flatMap(group=>group.rows.map((row,i)=>renderRow(row,group,i))):sortedRows.map(row=>renderRow(row,null,0))}</tbody></table>{empty&&<div className="mc-empty">선택 조건에 해당하는 항목이 없습니다.</div>}</div>
  </section>;
}
