import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeTestDailyPrices} from '../src/market/merge-test-daily-prices.mjs';

const html=readFileSync(new URL('../company-investment-analysis.html',import.meta.url),'utf8');
const start=html.indexOf('async function loadAll(){');
const end=html.indexOf('\n$("financialTicker").addEventListener("change"',start);
assert.ok(start>0&&end>start,'company page has a real async loadAll function');
const loadSource=html.slice(start,end);
const symbols=['MSFT','GOOGL','AMZN','META','TSLA','SPCX'];
const factory=new Function('deps',`
 const {SYMBOLS,isoDate,location,loadPublishedYahooReview,
   mergeTestDailyPrices,readSharedPriceSeries,connect,loadFinance,log}=deps;
 const elements={status:{textContent:''}};
 const $=id=>elements[id]||{value:'5y'};
 let busy=false,reloadPending=false,client=null,series=new Map(),companies=new Map();
 function renderSymbols(){log.push('renderSymbols')}
 function renderPrices(){log.push('renderPrices:'+([...series.values()].filter(x=>x.length).length))}
 ${loadSource}
 return {loadAll,series:()=>series,elements};
`);
function sampleFeed(withSpcx=true){
 const observations=[];
 for(const ticker of symbols.filter(t=>withSpcx||t!=='SPCX')){
  const begin=ticker==='SPCX'?'2026-06-12':'2021-11-22';
  for(let i=0;i<23;i++){
   const trading_date=new Date(Date.parse(begin+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
   observations.push({ticker,trading_date,close_price:String(100+i),currency:'USD',price_basis:'unadjusted_close'});
  }
  observations.push({ticker,trading_date:'2026-11-19',close_price:'150',currency:'USD',price_basis:'unadjusted_close'});
 }
 return {mode:'REVIEW_ONLY',source:'Yahoo Finance',
  database_insert_authorized:false,writes_performed:0,
  row_count:observations.length,observations};
}
async function run({withSpcx=true,publicOffline=false,serverOffline=false}={}){
 const log=[],published=sampleFeed(withSpcx);
 const page=factory({
  SYMBOLS:symbols,log,isoDate:()=> '2021-11-20',
  location:{href:'https://whsmac.github.io/investlab-test-pages/company-investment-analysis.html'},
  mergeTestDailyPrices:(known,review,opts)=>mergeTestDailyPrices(known,review,{
   ...opts,today:new Date('2026-11-20T10:00:00Z')}),
  loadPublishedYahooReview:async()=>{log.push('public');if(publicOffline)throw Error('public offline');return published},
  connect:async()=>{log.push('connect');if(serverOffline)throw Error('server offline');return {
   from:()=>({select:()=>({in:async()=>{log.push('companies');return {data:symbols.map(t=>({ticker:t,id:t,company_name:t})),error:null}}})})};
  },
  readSharedPriceSeries:async(_client,{ticker})=>{
   log.push('history:'+ticker);return {points:[{date:'2026-11-19',close:90}]};
  },
  loadFinance:async()=>{log.push('finance');}
 });
 await page.loadAll();
 return {log,series:page.series(),status:page.elements.status.textContent};
}
test('complete 5-year public prices render before the server and skip all DB history pagination',async()=>{
 const x=await run();
 assert.equal(x.log.filter(v=>v.startsWith('history:')).length,0);
 assert.ok(x.log.indexOf('renderPrices:6')<x.log.indexOf('companies'));
 assert.equal(x.series.get('TSLA')[0].date,'2021-11-22');
});
test('one uncovered optional ticker falls back to DB without delaying five public charts',async()=>{
 const x=await run({withSpcx:false});
 assert.deepEqual(x.log.filter(v=>v.startsWith('history:')),['history:SPCX']);
 assert.ok(x.log.indexOf('renderPrices:5')<x.log.indexOf('companies'));
 assert.equal(x.series.get('SPCX').length,1);
});
test('published public price series survives an unavailable TEST Supabase connection',async()=>{
 const x=await run({serverOffline:true});
 assert.ok(x.log.includes('renderPrices:6'));
 assert.equal(x.log.filter(v=>v.startsWith('history:')).length,0);
 assert.ok(x.status.includes('TEST 서버 미연결'));
 assert.equal(x.series.get('TSLA').length,24);
});
test('when public prices are unavailable, all six stored histories remain the fallback',async()=>{
 const x=await run({publicOffline:true});
 assert.equal(x.log.filter(v=>v.startsWith('history:')).length,6);
 assert.ok(x.status.includes('public offline'));
 assert.equal(x.series.get('TSLA').length,1);
});
