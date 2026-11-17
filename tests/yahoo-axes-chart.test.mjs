import test from "node:test";
import assert from "node:assert/strict";
import {chartAxisModel,renderYahooAxesChart} from "../src/market/yahoo-axes-chart.mjs";

const points=[
 {date:"2026-11-12",close:100},
 {date:"2026-11-13",close:120},
 {date:"2026-11-16",close:110}
];

test("chart includes X date ticks and five Y USD ticks",()=>{
 const model=chartAxisModel(points);
 assert.deepEqual(model.xTicks.map(t=>t.date),["2026-11-12","2026-11-13","2026-11-16"]);
 assert.equal(model.yTicks.length,5);
 assert.ok(model.yTicks.every(t=>Number.isFinite(t.y)));
 assert.equal(model.path.split(" ").length,3);
});

test("flat price series still yields finite coordinates",()=>{
 const model=chartAxisModel(points.map(p=>({...p,close:100})));
 assert.ok(!model.path.includes("NaN"));
 assert.ok(model.yTicks[0].value<model.yTicks[4].value);
});

test("invalid or insufficient chart points are rejected",()=>{
 assert.throws(()=>chartAxisModel(points.slice(0,1)));
 assert.throws(()=>chartAxisModel([{date:"2026-11-12",close:0},points[1]]));
});

test("SVG contains USD axis, date labels, and price line",()=>{
 const nodes=[];
 const doc={createElementNS(_ns,tag){
  const node={tag,attrs:{},children:[],textContent:"",
   setAttribute(key,value){this.attrs[key]=value;},append(child){this.children.push(child)}};
  nodes.push(node);return node;
 }};
 const svg=renderYahooAxesChart(doc,points,"TSLA");
 assert.equal(svg.attrs.role,"img");
 assert.match(svg.attrs["aria-label"],/X축 거래일, Y축 USD 가격/);
 assert.ok(nodes.some(n=>n.tag==="text"&&n.textContent==="USD"));
 assert.ok(nodes.some(n=>n.tag==="text"&&n.textContent==="11-16"));
 assert.ok(nodes.some(n=>n.tag==="text"&&n.textContent==="110.00"));
 assert.ok(nodes.some(n=>n.tag==="polyline"));
});

test("TEST page loads the axis chart module",async()=>{
 const page=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../test-yahoo-price-review.html",import.meta.url),"utf8"));
 assert.match(page,/import \{renderYahooAxesChart\}/);
 assert.match(page,/section\.append\(renderYahooAxesChart\(document,series\.points,series\.ticker\)\)/);
});
