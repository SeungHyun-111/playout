const list = value => Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {}).filter(Boolean);
const text = value => String(value ?? "").trim();
const normalized = value => text(value).normalize("NFKC").toLocaleLowerCase("ko");
export const BULK_MATERIAL_COLUMNS = [8,20,21,22,23,24];
export const MASTER_MATERIAL_COLUMNS = [6,15,17,19,21,23];

export function buildMaterialNames(headers,rows,settings) {
  const names={};
  const add=(id,name)=>{if(text(id) && text(name))names[text(id)]=text(name);};
  rows.forEach(row=>add(row[headers.indexOf("소재ID")],row[headers.indexOf("영상명")]));
  list(settings.advertisementCatalog).forEach(row=>add(row.material,row.materialName));
  list(settings.advertisements).forEach(row=>add(row.material,row.materialName));
  list(settings.bannerMaterials).forEach(row=>add(row.materialId,row.materialName));
  return names;
}
export const materialDisplay = (value,names) => names[text(value)] || String(value ?? "");
export function matchesSchedule(row,query,names,materialColumns,columns=row.map((_,i)=>i)) {
  const keyword=normalized(query);
  return !keyword || columns.some(column=>normalized(row[column]).includes(keyword) ||
    (materialColumns.includes(column) && normalized(materialDisplay(row[column],names)).includes(keyword)));
}
