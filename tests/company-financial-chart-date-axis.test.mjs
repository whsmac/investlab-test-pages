import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../company-investment-analysis.html',import.meta.url),'utf8');
const start=html.indexOf('function node(name,props={},value){');
const end=html.indexOf('function renderSymbols(){',start);
assert.ok(start>=0&&end>start,'must find the real SVG chart functions');
const source=html.slice(start,end);
class Shape {
 constructor(tag){this.tag=tag;this.attributes={};this.children=[];this.textContent='';}
 setAttribute(name,value){this.attributes[name]=String(value);}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
}
const svgFactory=new Function('document','selected','fmt',source+';return {chart};');
function render(sets,finance,from){
 const document={createElementNS:(_ns,name)=>new Shape(name)};
 const {chart}=svgFactory(document,'TSLA',(n,dec=2)=>Number(n).toFixed(dec));
 const svg=new Shape('svg');
 chart(svg,sets,{index:false,finance,from});
 return svg;
}
const row=(date)=>({
 period_end:date,revenue_usd_bn:50,capex_usd_bn:10,
 operating_income_usd_bn:20,operating_margin_pct:40
});
const nodes=(svg,tag)=>svg.children.filter(n=>n.tag===tag);
const labels=(svg)=>nodes(svg,'text').map(n=>n.textContent);

test('five-year financial tracks render even if no daily price observations exist',()=>{
 const svg=render([],[row('2023-03-31'),row('2025-09-30')],'2021-11-20');
 assert.equal(nodes(svg,'circle').length,8);
 assert.match(labels(svg).join(' '),/주가 없음/);
 assert.ok(labels(svg).includes('2021-11-20'));
 assert.ok(labels(svg).some(x=>String(x).startsWith('2026-')));
});

test('three-year financial quarters are not clipped to a single month of prices',()=>{
 const sets=[{ticker:'TSLA',color:'#ccc',selected:true,
  points:[{date:'2026-10-01',value:300},{date:'2026-11-19',value:450}]}];
 const svg=render(sets,[row('2022-12-31'),row('2024-03-31'),row('2025-09-30')],'2023-11-20');
 assert.equal(nodes(svg,'circle').length,8);
 assert.ok(labels(svg).includes('2023-11-20'));
 assert.ok(nodes(svg,'path').length>=5,'price path plus four quarterly tracks');
});

test('out-of-range quarterly facts are excluded and a wholly empty chart is explicit',()=>{
 const svg=render([],[row('2020-12-31')],'2023-11-20');
 assert.match(labels(svg).join(' '),/주가·분기 재무자료가 없습니다/);
 assert.equal(nodes(svg,'circle').length,0);
});
