import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDateInput as date, normalizeTimeInput as time, normalizeDateTimeInput as stamp } from "../src/lib/flexibleDate.js";
import { parseSpreadsheet } from "../src/lib/spreadsheetPaste.js";

test("date entry follows PGMDR compact / short-year / yearless formats",()=>{
  for(const input of ["20261103","261103","2026/11/3","26-11-3","2026.11.03","11/3","1103","2026년 11월 3일","2026/11/03 (화)","２０２６１１０３"])
    assert.equal(date(input,2026),"2026-11-03",input);
  assert.equal(date(""),"");assert.equal(date("2026-02-30"),null);assert.equal(date("20260229"),null);assert.equal(date("20240229"),"2024-02-29");
  const serial=String((Date.UTC(2026,10,3)-Date.UTC(1899,11,30))/86400000);
  assert.equal(date(serial),"2026-11-03");
});
test("broadcast datetime supports pasted columns, compact digits, time separators and seconds",()=>{
  for(const input of ["11/3 2331","202611032331","2026/11/03\t23:31","26.11.3 23:31:00","2026-11-03T23:31","2026/11/03 23:31 ~ 00:31"])
    assert.equal(stamp(input,2026),"2026-11-03 23:31:00",input);
  assert.equal(stamp("20261103233135"),"2026-11-03 23:31:35");
  assert.equal(stamp("11/3 9",2026),"2026-11-03 09:00:00");
  assert.equal(stamp("11/3 2461",2026),null);assert.equal(stamp("2026-02-30 0131"),null);
});
test("time entry supports hour, compact minutes, seconds and rejects invalid rollover",()=>{
  assert.equal(time("1"),"01:00:00");assert.equal(time("131"),"01:31:00");assert.equal(time("013135"),"01:31:35");
  assert.equal(time("1:3"),"01:03:00");assert.equal(time("24:00"),null);assert.equal(time("12:99"),null);assert.equal(time(""),"");
});
test("Excel paste parser preserves quoted newlines and empty cells",()=>{
  assert.deepEqual(parseSpreadsheet('20261103\t261105\r\n"11/3\ntext"\t\r\n'),[["20261103","261105"],["11/3\ntext",""]]);
});
