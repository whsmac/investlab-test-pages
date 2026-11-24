import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPortfolioAllocation,renderPortfolioAllocation} from '../src/ui/pilot-portfolio-allocation.mjs';
import {projectLedger} from '../src/ledger/pilot-portfolio-projection.mjs';

const source=()=>({version:1,accounts:[{id:'a',name:'TEST A',type:'brokerage'},{id:'b',name:'TEST B',type:'brokerage'}],entries:[
 {id:'1',accountId:'a',type:'OPEN',date:'2026-11-20',symbol:'TSLA',qty:2,price:200,currency:'USD'},
 {id:'2',accountId:'a',type:'OPEN',date:'2026-11-20',symbol:'USD',qty:3,price:40,currency:'USD'},
 {id:'3',accountId:'a',type:'DEPOSIT',date:'2026-11-20',amount:100,currency:'USD'},
 {id:'4',accountId:'b',type:'OPEN',date:'2026-11-20',symbol:'TSLA',qty:1,price:220,currency:'USD'},
 {id:'5',accountId:'b',type:'OPEN',date:'2026-11-20',symbol:'TQQQ',qty:4,price:50,currency:'USD'},
 {id:'6',accountId:'b',type:'DEPOSIT',date:'2026-11-20',amount:130000,currency:'KRW'}
]});
const quotes=new Map([['TSLA',{close:300,currency:'USD'}],['USD',{close:50,currency:'USD'}],
 ['TQQQ',{close:75,currency:'USD'}]]);
const args=(opts={})=>({data:source(),prices:quotes,fx:1300,selected:'ALL',displayCurrency:'USD',...opts});
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);

test('existing account positions are aggregated: ticker USD is ETF, cash stays separate',()=>{
 const data=source(),copy=structuredClone(data);
 const model=buildPortfolioAllocation(args({data}));
 assert.equal(model.complete,true);
 assert.deepEqual(model.rows.map(x=>x.label),['TSLA','TQQQ','USD','현금']);
 assert.equal(model.rows.find(x=>x.label==='USD').amount,150,'ticker USD = ETF shares, not dollar cash');
 assert.equal(model.rows.find(x=>x.label==='현금').amount,200,'cash includes USD100 and KRW130000/1300');
 assert.equal(model.total,1550);
 near(model.rows.reduce((sum,r)=>sum+r.percentage,0),100);
 near(model.rows.find(x=>x.label==='TSLA').percentage,900/1550*100);
 assert.deepEqual(data,copy,'never mutate original account transactions');
 assert.equal(projectLedger(data,'ALL').holdings.length,3);
});

test('changing selected account affects donut holdings AND cash without changing global ledger',()=>{
 const a=buildPortfolioAllocation(args({selected:'a'}));
 assert.equal(a.total,850); // TSLA600 + USD ETF150 + USD cash100
 assert.deepEqual(a.rows.map(x=>x.label),['TSLA','USD','현금']);
 const b=buildPortfolioAllocation(args({selected:'b'}));
 assert.equal(b.total,700); // TSLA300 + TQQQ300 + KRW cash100
 assert.deepEqual(new Set(b.rows.map(x=>x.label)),new Set(['TSLA','TQQQ','현금']));
 near(b.rows.find(x=>x.kind==='cash').percentage,100/700*100);
});

test('KRW/USD choice changes display units but never changes allocation percentages',()=>{
 const usd=buildPortfolioAllocation(args());
 const krw=buildPortfolioAllocation(args({displayCurrency:'KRW'}));
 near(krw.total,usd.total*1300);
 for(const row of usd.rows){
  const other=krw.rows.find(r=>r.label===row.label);
  near(other.percentage,row.percentage);
  near(other.amount,row.amount*1300);
 }
 assert.equal(krw.rows.find(x=>x.kind==='cash').description,'USD 100 · KRW 130,000');
});

test('missing quotes or missing FX do not show misleading partial ratios',()=>{
 const missing=new Map([['TSLA',quotes.get('TSLA')]]);
 const fail=buildPortfolioAllocation(args({prices:missing}));
 assert.equal(fail.complete,false);
 assert.equal(fail.total,null);
 assert.equal(fail.rows.length,0);
 assert.match(fail.notice,/TQQQ|USD/);
 assert.equal(buildPortfolioAllocation(args({fx:null,displayCurrency:'KRW'})).complete,false);
 assert.equal(buildPortfolioAllocation(args({fx:null,displayCurrency:'USD'})).complete,false);
});

test('cash-only account is 100% cash, empty account does not divide by zero',()=>{
 const onlyCash={version:1,accounts:[{id:'x',name:'only cash'}],
  entries:[{id:'cash1',accountId:'x',type:'DEPOSIT',date:'2026-11-20',amount:200,currency:'USD'}]};
 const model=buildPortfolioAllocation(args({data:onlyCash,selected:'x',fx:null}));
 assert.equal(model.complete,true);
 assert.equal(model.rows[0].label,'현금');
 near(model.rows[0].percentage,100);
 const empty=buildPortfolioAllocation(args({data:{...onlyCash,entries:[]},fx:1300,selected:'x'}));
 assert.equal(empty.complete,true);
 assert.equal(empty.rows.length,0);
 assert.equal(empty.total,0);
});

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.attributes={};this.style={};this.className='';}
 append(...xs){this.children.push(...xs);}
 replaceChildren(...xs){this.children=[...xs];}
 setAttribute(k,v){this.attributes[k]=String(v);}
}
function flatten(node){return [node,...node.children.flatMap(flatten)];}
test('rendered SVG uses a ring for every positive asset, readable labels and accessible values',()=>{
 const prev=globalThis.document;
 globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag)};
 try{
  const nodes={chart:new Element('div'),legend:new Element('ul'),status:new Element('p'),title:new Element('strong')};
  renderPortfolioAllocation(buildPortfolioAllocation(args()),nodes);
  const svg=nodes.chart.children[0];
  assert.equal(svg.tag,'svg');
  assert.equal(svg.attributes.role,'img');
  assert.match(svg.attributes['aria-label'],/현금/);
  assert.match(svg.attributes['aria-label'],/USD/);
  assert.equal(flatten(svg).filter(el=>el.tag==='circle').length,5,'background + 4 allocation arcs');
  assert.equal(nodes.legend.children.length,4);
  assert.equal(nodes.title.textContent,'전체 계좌');
  assert.ok(flatten(nodes.legend).some(n=>n.textContent==='USD 200'));
  const single=buildPortfolioAllocation(args({selected:'a'}));
  renderPortfolioAllocation(single,nodes);
  assert.equal(nodes.title.textContent,'선택 계좌');
  assert.equal(nodes.legend.children.length,3);
  renderPortfolioAllocation(buildPortfolioAllocation(args({prices:new Map()})),nodes);
  assert.equal(nodes.chart.children[0].tag,'p');
  assert.equal(nodes.legend.children.length,0);
 }finally{globalThis.document=prev;}
});

test('actual Pilot page positions the allocation beside account selector and protects auth gate',()=>{
 const html=readFileSync(new URL('../my-portfolio.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/ui/pilot-portfolio-dashboard.mjs',import.meta.url),'utf8');
 for(const id of ['allocationChart','allocationLegend','allocationStatus','allocationAccount','account'])
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1);
 assert.ok(html.indexOf('id="portfolioPrivate"')<html.indexOf('id="allocationChart"'));
 assert.ok(html.indexOf('id="allocationChart"')<html.indexOf('id="dashboardAccounts"'));
 assert.match(html,/\.allocation-layout\{display:grid/);
 assert.match(html,/@media\(max-width:750px\)\{\.allocation-layout\{grid-template-columns:1fr/);
 assert.match(js,/buildPortfolioAllocation\(\{data,prices,fx,selected,displayCurrency:mode\}\)/);
 assert.match(js,/renderPortfolioAllocation\(allocation/);
 assert.match(html,/account\.onchange=\(\)=>/);
 assert.match(html,/\$\('displayCurrency'\)\.addEventListener\('change'/);
 assert.doesNotMatch(html,/supabase\.from\('allocation/);
});
