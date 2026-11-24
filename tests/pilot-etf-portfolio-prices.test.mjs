import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadPublishedEtfCloses,parsePublishedEtfCloses,ETF_SYMBOLS} from '../src/market/load-published-etf-closes.mjs';
import {projectLedger} from '../src/ledger/pilot-portfolio-projection.mjs';
import {renderPortfolioDashboard} from '../src/ui/pilot-portfolio-dashboard.mjs';

const date=new Date('2026-11-24T09:00:00Z');
const report=()=>({mode:'PILOT_ETF_CLOSING_QUOTES_V1',source:'Yahoo Finance',
 generated_on:'2026-11-24',database_writes:0,writes_performed:0,quote_count:3,
 quotes:[['BITU','12.25'],['TQQQ','72.50'],['USD','51.75']].map(([ticker,close_price])=>({
   ticker,trading_date:'2026-11-23',close_price,currency:'USD',price_basis:'unadjusted_close'
 }))});
const origin='https://whsmac.github.io/investlab-test-pages/my-portfolio.html';
test('fixed public ETF quote list distinguishes USD ETF from portfolio dollar cash',()=>{
 assert.deepEqual(ETF_SYMBOLS,['BITU','TQQQ','USD']);
 const prices=parsePublishedEtfCloses(report(),{now:date});
 assert.equal(prices.size,3);
 assert.equal(prices.get('USD').close,51.75);
 assert.equal(prices.get('BITU').date,'2026-11-23');
});
test('missing, stale, wrong symbol and private data fail closed',()=>{
 const broken=report();broken.quotes.pop();
 assert.throws(()=>parsePublishedEtfCloses(broken,{now:date}),/검증 실패/);
 const bad=report();bad.quotes[0].trading_date='2026-11-01';
 assert.throws(()=>parsePublishedEtfCloses(bad,{now:date}),/최신/);
 const unexpected=report();unexpected.quotes[0].ticker='FAKE';
 assert.throws(()=>parsePublishedEtfCloses(unexpected,{now:date}),/ETF 종목/);
 const privateData=report();privateData.quotes[0].userId='secret-user';
 assert.throws(()=>parsePublishedEtfCloses(privateData,{now:date}),/허용되지 않은/);
});
test('must be same-origin, a real JSON response and credential-free',async()=>{
 const seen=[];
 const quotes=await loadPublishedEtfCloses({origin,now:date,fetcher:async(url,opts)=>{
  seen.push({url,opts});
  return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>report()};
 }});
 assert.equal(quotes.size,3);
 assert.deepEqual(seen,[{url:'https://whsmac.github.io/investlab-test-pages/data/portfolio-etf-quotes.json',
  opts:{cache:'no-store',credentials:'omit',redirect:'error'}}]);
 await assert.rejects(()=>loadPublishedEtfCloses({origin:'https://evil.test/investlab-test-pages/my-portfolio.html'}),/허용되지 않은/);
 await assert.rejects(()=>loadPublishedEtfCloses({origin,fetcher:async()=>({ok:false,status:404}),now:date}),/HTTP 404/);
});
test('weekend grace period does not mislabel an old closing price as live',()=>{
 const before=report();
 before.generated_on='2026-11-21';
 assert.equal(parsePublishedEtfCloses(before,{now:date}).size,3);
 assert.throws(()=>parsePublishedEtfCloses(before,{now:new Date('2026-12-02T00:00:00Z')}),/게시일 오류/);
});
function el(name='div'){
 return {name,textContent:'',className:'',style:{},attributes:{},value:'ALL',children:[],
  setAttribute(key,value){this.attributes[key]=String(value)}, 
  classList:{add(){}},append(...child){this.children.push(...child)},
  replaceChildren(...child){this.children=[...child]},
  dispatchEvent(){}};
}
test('both accounts are valued when all company and ETF closing prices are present',()=>{
 const data={version:1,accounts:[{id:'a',name:'Broker A',type:'일반'},{id:'b',name:'Broker B',type:'일반'}],entries:[
  {id:'1',accountId:'a',type:'OPEN',date:'2026-11-23',symbol:'BITU',qty:3,price:10,currency:'USD'},
  {id:'2',accountId:'a',type:'OPEN',date:'2026-11-23',symbol:'TQQQ',qty:4,price:65,currency:'USD'},
  {id:'3',accountId:'b',type:'OPEN',date:'2026-11-23',symbol:'USD',qty:2,price:55,currency:'USD'},
  {id:'4',accountId:'b',type:'OPEN',date:'2026-11-23',symbol:'TSLA',qty:5,price:300,currency:'USD'},
  {id:'5',accountId:'b',type:'DEPOSIT',date:'2026-11-23',currency:'USD',amount:250}
 ]};
 const quotes=parsePublishedEtfCloses(report(),{now:date});
 const prices=new Map([...quotes].map(([ticker,row])=>[ticker,row]));
 prices.set('TSLA',{date:'2026-11-23',close:320,currency:'USD'});
 const ids=['dashboardTotal','dashboardGain','dashboardRate','dashboardStocks','dashboardCash',
  'dashboardCashBreakdown','dashboardFx','dashboardAccounts','dashboardHoldings',
  'dashboardNotice','account','accountTotalHeader','accountGainHeader','holdingAverageHeader',
  'holdingCloseHeader','holdingValueHeader','holdingGainHeader'];
 const nodes=new Map(ids.map(id=>[id,el()]));
 const prior=globalThis.document;
 globalThis.document={getElementById:id=>nodes.get(id),createElement:el,createElementNS:(_ns,tag)=>el(tag),querySelector:selector=>selector==='.total-label'?nodes.get('total-label')||nodes.set('total-label',el()).get('total-label'):null};
 try{
  renderPortfolioDashboard({data,prices,fx:1300,fxDate:'test',selected:'ALL',displayCurrency:'KRW'});
  const asset=(3*12.25+4*72.5+2*51.75+5*320+250)*1300;
  assert.equal(nodes.get('dashboardTotal').textContent,'KRW '+Math.round(asset).toLocaleString('ko-KR'));
  assert.equal(nodes.get('dashboardHoldings').children.length,4);
  assert.equal(nodes.get('dashboardAccounts').children.length,3);
  assert.ok(!nodes.get('dashboardNotice').textContent.includes('미조회'));
  assert.equal(projectLedger(data).cash.USD,250,'USD ETF shares must not increase dollar cash');
 }finally{globalThis.document=prior;}
});
test('Pilot pages keep target prices separate from public market quotes',()=>{
 const portfolio=readFileSync(new URL('../my-portfolio.html',import.meta.url),'utf8');
 const simulator=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(portfolio,/loadPublishedEtfCloses\(\{origin:location\.href\}\)/);
 assert.match(simulator,/loadPublishedEtfCloses\(\{origin:location\.href\}\)/);
 assert.match(simulator,/Do not use it to overwrite/);
 assert.match(portfolio,/ETF 시세/);
});
