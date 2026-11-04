import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMaterialNames, materialDisplay, matchesSchedule, BULK_MATERIAL_COLUMNS, MASTER_MATERIAL_COLUMNS } from "../src/lib/scheduleView.js";
import { BULK_COLUMN_ORDER } from "../src/lib/bulkColumns.js";

test("looks up actual video, advertisement and banner names with ID fallback",()=>{
  const names=buildMaterialNames(["소재ID","영상명"],[["0P001","방송 영상"]],{
    bannerMaterials:[{materialId:"0F001",materialName:"삼성 행사카드"}],
    advertisementCatalog:{a:{material:"AD1",materialName:"공익광고"}},
  });
  assert.equal(materialDisplay("0P001",names),"방송 영상");
  assert.equal(materialDisplay("AD1",names),"공익광고");
  assert.equal(materialDisplay("0F001",names),"삼성 행사카드");
  assert.equal(materialDisplay("UNKNOWN",names),"UNKNOWN");
});
test("searches original IDs and resolved names without mutating export/save data",()=>{
  const names={"0F001":"삼성 행사카드"};
  const bulk=Array(25).fill("");bulk[20]="0F001";bulk[7]="스케쳐스 편성";bulk[15]="삭제한 열";
  const original=[...bulk];
  assert.ok(matchesSchedule(bulk,"삼성",names,BULK_MATERIAL_COLUMNS,BULK_COLUMN_ORDER));
  assert.ok(matchesSchedule(bulk,"0f001",names,BULK_MATERIAL_COLUMNS,BULK_COLUMN_ORDER));
  assert.ok(matchesSchedule(bulk,"스케쳐스",names,BULK_MATERIAL_COLUMNS,BULK_COLUMN_ORDER));
  assert.ok(!matchesSchedule(bulk,"없는키워드",names,BULK_MATERIAL_COLUMNS,BULK_COLUMN_ORDER));
  assert.ok(!matchesSchedule(bulk,"삭제한 열",names,BULK_MATERIAL_COLUMNS,BULK_COLUMN_ORDER));
  assert.deepEqual(bulk,original);
  const master=Array(24).fill("");master[23]="0F001";
  assert.ok(matchesSchedule(master,"삼성",names,MASTER_MATERIAL_COLUMNS));
  assert.ok(matchesSchedule(master," ",names,MASTER_MATERIAL_COLUMNS));
});
