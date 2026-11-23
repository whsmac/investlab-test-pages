import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {enrichQuarterlyFinance} from "../src/market/company-chart-metrics.mjs";

const html=readFileSync(new URL("../company-investment-analysis.html",import.meta.url),"utf8");
class Shape{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.textContent="";this.dataset={};}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getBoundingClientRect(){return {left:0,width:900};}
}
function allNodes(root){return [root,...root.children.flatMap(allNodes)];}
const format=(n,dec=2)=>Number(n).toFixed(dec);
function chartFixture({index=false}={}){
 const source=html.slice(html.indexOf("function node(name,props={},value){"),html.indexOf("function renderSymbols(){"));
 assert.match(source,/const popup=node\("g"/);
 const detail=new Shape("output");
 const document={
  createElementNS:(_ns,name)=>new Shape(name),
  getElementById:id=>id==="chartDetail"?detail:null
 };
 const chart=new Function("document","selected","fmt",source+";return chart;")(document,"TSLA",format);
 const svg=new Shape("svg");
 chart(svg,[{ticker:"TSLA",selected:true,color:"#f6818b",points:[
  {date:"2026-11-17",close:345.82,value:index?100:345.82},
  {date:"2026-11-20",close:369.25,value:index?106.78:369.25}
 ]}],{from:"2026-11-01",index,finance:[]});
 return {svg,detail};
}
test("price hover exposes selected date and actual USD close directly inside the SVG",()=>{
 const {svg,detail}=chartFixture();
 svg.onpointermove({clientX:850,type:"pointermove"});
 const groups=allNodes(svg).filter(n=>n.tag==="g");
 assert.equal(groups.length,1);
 assert.equal(groups[0].attributes.opacity,"1");
 assert.ok(allNodes(groups[0]).some(n=>String(n.textContent).includes("USD 369.25")));
 assert.match(detail.textContent,/2026-11-20/);
 assert.match(detail.textContent,/TSLA\s+USD 369\.25/);
 svg.onpointerleave();
 assert.equal(groups[0].attributes.opacity,"0","unpinned hover should dismiss");
});
test("click or touch pins the date and price and shows true closing price in index mode",()=>{
 const {svg,detail}=chartFixture({index:true});
 svg.onpointerdown({clientX:845,type:"pointerdown"});
 const box=allNodes(svg).find(n=>n.tag==="g");
 assert.equal(box.attributes.opacity,"1");
 assert.ok(allNodes(box).some(n=>String(n.textContent).includes("USD 369.25")));
 assert.ok(allNodes(box).some(n=>String(n.textContent).includes("100기준")));
 svg.onpointerleave();
 assert.equal(box.attributes.opacity,"1","selected day must remain visible after click");
 assert.match(detail.textContent,/369\.25/);
});
test("financial period table has exactly five cells, with QoQ and YoY beneath the right metric",()=>{
 const financeRows=new Shape("tbody"),period=new Shape("select");period.value="1y";
 const document={createElement:tag=>new Shape(tag),getElementById:id=>id==="financeRows"?financeRows:period};
 const start=html.indexOf("function drawFinance(rows){"),end=html.indexOf("async function connect(){",start);
 assert.ok(start>0&&end>start);
 const draw=new Function("document","$","fmt","isoDate","enrichQuarterlyFinance","renderPrices",
  html.slice(start,end)+";return drawFinance;")(
   document,id=>document.getElementById(id),format,()=>"2025-01-01",enrichQuarterlyFinance,()=>{});
 const rows=[
  {fiscal_period:"2025-Q1",period_end:"2025-03-31",revenue_usd_bn:80,capex_usd_bn:10,operating_income_usd_bn:16,operating_margin_pct:20},
  {fiscal_period:"2025-Q4",period_end:"2025-12-31",revenue_usd_bn:100,capex_usd_bn:20,operating_income_usd_bn:25,operating_margin_pct:25},
  {fiscal_period:"2026-Q1",period_end:"2026-03-31",revenue_usd_bn:120,capex_usd_bn:15,operating_income_usd_bn:36,operating_margin_pct:30}
 ];
 draw(rows);
 assert.equal(financeRows.children.length,3);
 const latest=financeRows.children[0];
 assert.equal(latest.children.length,5,"quarter + four metrics; no right-hand side QoQ/YoY columns");
 const revenue=latest.children[1],margin=latest.children[4];
 assert.equal(revenue.dataset.metric,"매출액");
 assert.equal(revenue.children[0].textContent,"120.00");
 assert.deepEqual(revenue.children.slice(1).map(n=>n.children.map(c=>c.textContent).join(" ")),["전분기 +20.0%","전년동기 +50.0%"]);
 assert.deepEqual(margin.children.slice(1).map(n=>n.children.map(c=>c.textContent).join(" ")),["전분기 +5.0%p","전년동기 +10.0%p"]);
});
test("small screens use metric cards and no oversized comparison columns",()=>{
 assert.match(html,/class="finance-table"/);
 assert.match(html,/\.finance-table tr\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/content:attr\(data-metric\)/);
 assert.doesNotMatch(html,/<th>전분기 변화\(QoQ\)<\/th>/);
 assert.ok(html.indexOf('id="chartDetail"')<html.indexOf('id="priceChart"'),"detail is visible before tall chart");
});
