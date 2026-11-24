import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFinnhubQuote,effectivePortfolioPrices,fetchPersonalQuotes,formatPortfolioNumber} from '../src/market/pilot-personal-current-quotes.mjs';
import {buildPortfolioAllocation} from '../src/ui/pilot-portfolio-allocation.mjs';
const now=Date.parse('2026-11-24T16:00:00Z'),t=Math.floor(now/1000);
const prior=new Map([['TSLA',{date:'2026-11-23',close:385.46,currency:'USD'}],['USD',{date:'2026-11-23',close:47.77,currency:'USD'}]]);
test('validate quote age and preserve exact source price, including USD ETF',()=>{
 const q=parseFinnhubQuote('TSLA',{c:390.456,t},now);
 assert.equal(q.close,390.456);assert.equal(q.date,'2026-11-24');assert.equal(q.kind,'current_quote');
 assert.equal(parseFinnhubQuote('USD',{c:48.23,t},now).close,48.23);
 for(const r of [{c:0,t},{c:400,t:t-181},{c:400,t:t+60},{c:'400',t},{c:400,t:0}])assert.equal(parseFinnhubQuote('TSLA',r,now),null);
 const merged=effectivePortfolioPrices(prior,new Map([['TSLA',q]]),now);
 assert.equal(merged.get('TSLA').close,390.456);assert.equal(merged.get('USD').close,47.77);
 assert.equal(effectivePortfolioPrices(prior,new Map([['TSLA',q]]),now+181000).get('TSLA').close,385.46);
 assert.equal(prior.get('TSLA').close,385.46);
});
test('quotes are only sent to fixed vendor with header and no cookies or credentials in URL',async()=>{
 const requests=[];
 const result=await fetchPersonalQuotes({tickers:['TSLA','USD','TSLA'],key:'synthetic_test_key',now:()=>now,fetcher:async(url,opts)=>{
  requests.push({url,opts});return {ok:true,json:async()=>({c:390.456,t})};
 }});
 assert.equal(result.quotes.size,2);assert.equal(requests.length,2);
 assert.ok(requests.every(r=>r.url.startsWith('https://finnhub.io/api/v1/quote?symbol=')&&!r.url.includes('synthetic_test_key')&&r.opts.credentials==='omit'&&r.opts.headers['X-Finnhub-Token']==='synthetic_test_key'&&r.opts.redirect==='error'));
 const denied=await fetchPersonalQuotes({tickers:['TSLA'],key:'synthetic_test_key',now:()=>now,fetcher:async()=>({ok:false,status:403})});
 assert.equal(denied.quotes.size,0);assert.equal(denied.errors[0].error,'HTTP 403');
});
test('display formatting and exact portfolio calculation remain distinct',()=>{
 assert.equal(formatPortfolioNumber(385.46,1),'385.5');assert.equal(formatPortfolioNumber(49,1),'49.0');assert.equal(formatPortfolioNumber(85572.12),'85,572');assert.equal(formatPortfolioNumber(222),'222');
 const ledger={version:1,accounts:[{id:'a',name:'A'}],entries:[{id:'1',accountId:'a',type:'OPEN',date:'2026-11-20',symbol:'TSLA',qty:222,price:385.19,currency:'USD'}]};
 const q=parseFinnhubQuote('TSLA',{c:390.456,t},now);
 const prices=effectivePortfolioPrices(prior,new Map([['TSLA',q]]),now);
 const allocation=buildPortfolioAllocation({data:ledger,prices,fx:1300,selected:'ALL',displayCurrency:'USD'});
 assert.equal(allocation.total,222*390.456);assert.match(allocation.notice,/현재 시세/);
});
test('actual page has explicit opt-in and effective quote overlay, no credential persistence',()=>{
 const html=readFileSync(new URL('../my-portfolio.html',import.meta.url),'utf8');
 const dashboard=readFileSync(new URL('../src/ui/pilot-portfolio-dashboard.mjs',import.meta.url),'utf8');
 assert.match(html,/id="personalQuoteKey" type="password"/);
 assert.match(html,/personalQuoteConsent'\)\.checked/);
 assert.match(html,/prices:effectivePortfolioPrices\(prices,personalQuotes\)/);
 assert.match(html,/personalQuoteKey='';personalQuoteOwner=null;personalQuotes.clear/);
 assert.doesNotMatch(html,/(localStorage|sessionStorage)\.setItem\([^;\n]*personalQuote/);
 assert.match(dashboard,/formatPortfolioNumber\(h.qty\)/);
 assert.match(dashboard,/tableMoney\(fromUsd\(Number\(q.close\)\),1\)/);
 assert.match(dashboard,/h.qty\*Number\(q.close\)/);
});
