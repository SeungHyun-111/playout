import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { WORKFLOW_STEPS } from "../src/lib/tourContent.js";

// Use a normal Playwright installation, or the isolated QA installation on Windows.
const {chromium}=await import("playwright").catch(()=>import(pathToFileURL(path.join(process.env.TEMP,"playout-ui-qa/node_modules/playwright/index.mjs"))));
const output=path.join(process.env.TEMP,"playout-ui-review");await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},ignoreHTTPSErrors:true});
const page=await context.newPage(),errors=[],report=[];
page.on("pageerror",error=>errors.push(error.message));
const pause=()=>page.waitForTimeout(220);
async function screenshot(name){await page.screenshot({path:path.join(output,`${name}.png`)});}
async function openGuide(){await page.locator(".chiikawa-wanderer").click({force:true});await page.getByRole("dialog").waitFor();}
async function geometry(){return page.evaluate(()=>{
 const box=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
 return {card:box(".app-tour-card"),highlight:box(".tour-highlight"),viewport:{w:innerWidth,h:innerHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
});}
try {
 await page.goto("http://127.0.0.1:5173/");await page.locator(".chiikawa-wanderer").waitFor();await page.waitForTimeout(1600);
 await screenshot("initial");
 for(const name of ["운영설정","예외설정","프로모션","행사카드 일정","내부 일괄등록","광고 설정","주조 운행표","메모","송출 Q&A"]){
  await page.getByRole("button",{name,exact:true}).first().click();await pause();
  report.push({menu:name,...await geometry()});
  if(name==="운영설정"){
    await page.locator(".default-settings-panel").evaluate(element=>element.scrollIntoView({block:"start"}));await pause();
    const tops=await page.evaluate(()=>[document.querySelector(".default-materials-section .settings-table"),...document.querySelectorAll(".card-exclusion-panel .settings-table")].map(element=>element?.getBoundingClientRect().top));
    report.push({operationTableTops:tops,aligned:tops.length===3 && tops.every(top=>Math.abs(top-tops[0])<1)});
    await screenshot("operation-three-columns");
  }
  if(["예외설정","내부 일괄등록","주조 운행표"].includes(name))await screenshot(`menu-${report.length}`);
  if(name==="예외설정"){
    const period=page.locator(".period-title-toggle").first();
    if(await period.count()){await period.click();await pause();await screenshot("exceptions-expanded");await period.click();}
  }
 }
 await openGuide();await screenshot("chooser");
 await page.getByRole("button",{name:/1\. 업무 플로우 안내/}).click();
 for(let index=0;index<WORKFLOW_STEPS.length;index++){
  await page.locator(".tour-highlight").waitFor({timeout:7000});await pause();
  const data=await geometry();
  const target=await page.locator(WORKFLOW_STEPS[index].target).first().boundingBox();
  report.push({workflow:index+1,title:WORKFLOW_STEPS[index].title,...data,target});
  if([0,2,4,5,9].includes(index))await screenshot(`flow-${index+1}`);
  await page.getByRole("button",{name:index===WORKFLOW_STEPS.length-1 ? "완료" : "다음",exact:true}).click();
 }
 for(const name of ["예외설정","프로모션","내부 일괄등록","주조 운행표","메모","송출 Q&A"]){
  await page.getByRole("button",{name,exact:true}).first().click();await pause();await openGuide();
  await page.getByRole("button",{name:/2\. 현재 메뉴 도움말/}).click();
  let count=0;
  while(count++<12){await page.locator(".tour-highlight").waitFor({timeout:4000});await pause();report.push({help:name,step:count,...await geometry()});
   if(name==="주조 운행표" && count===4)await screenshot("comment-help");
   const next=page.getByRole("button",{name:"다음",exact:true});
   if(await next.count())await next.click();else {await page.getByRole("button",{name:"완료",exact:true}).click();break;}
  }
 }
 await page.getByRole("button",{name:"사이드바 접기",exact:true}).click();await page.waitForTimeout(650);
 await page.getByRole("button",{name:"예외설정",exact:true}).first().hover();await pause();await screenshot("sidebar-tooltip");
 report.push({tooltip:await page.getByRole("tooltip").evaluate(e=>{const before=e.style.pointerEvents;e.style.pointerEvents="auto";const topmost=document.elementFromPoint(e.getBoundingClientRect().x+5,e.getBoundingClientRect().y+5)===e;e.style.pointerEvents=before;return {text:e.textContent,topmost};})});
 await page.setViewportSize({width:1024,height:768});await page.getByRole("button",{name:"송출 Q&A",exact:true}).first().scrollIntoViewIfNeeded();await screenshot("narrow-sidebar-bottom");await page.getByRole("button",{name:"예외설정",exact:true}).first().click();await pause();await screenshot("narrow-exceptions");
 await openGuide();await page.getByRole("button",{name:/2\. 현재 메뉴 도움말/}).click();await pause();report.push({narrow:true,...await geometry()});await screenshot("narrow-guide");
 await page.getByRole("button",{name:"닫기",exact:true}).click();
 await page.setViewportSize({width:1280,height:720});
 await page.getByRole("button",{name:"예외설정",exact:true}).first().click();await pause();
 const period=page.locator(".period-title-toggle").first();
 if(await period.count()){
  if(await period.getAttribute("aria-expanded")==="false")await period.click();
  await pause();await screenshot("compact-exceptions-expanded");report.push({compact:true,...await geometry()});
 }
 for(const check of report){
  if(check.horizontalOverflow)errors.push(`Document overflow: ${JSON.stringify(check)}`);
  if(check.card && (check.card.x<0 || check.card.y<0 || check.card.x+check.card.w>check.viewport.w+.5 || check.card.y+check.card.h>check.viewport.h+.5))errors.push(`Guide outside viewport: ${JSON.stringify(check)}`);
  if(check.tooltip && !check.tooltip.topmost)errors.push("Sidebar tooltip is obscured");
  if(check.workflow && !check.highlight)errors.push(`Missing highlight on workflow ${check.workflow}`);
  if(check.operationTableTops && !check.aligned)errors.push(`Operation tables are not aligned: ${check.operationTableTops}`);
 }
} catch(error){errors.push(error.stack);} finally {
 await fs.writeFile(path.join(output,"report.json"),JSON.stringify({report,errors},null,2));
 console.log(JSON.stringify({output,checks:report.length,errors},null,2));await browser.close();
 if(errors.length)process.exitCode=1;
}
