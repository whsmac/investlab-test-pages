import test from 'node:test';
import assert from 'node:assert/strict';
import {assetRadius,treemap,composition,sampleTimeline,priceChange,comparisonRows,reviewTrade} from '../src/market/pilot-visual-performance.mjs';
import {indexRows} from '../src/ledger/pilot-portfolio-history.mjs';
test('donut area and map tile area are proportional, not diameter or arbitrary emphasis',()=>{
 assert.equal(assetRadius(25,100),44);assert.equal(assetRadius(100,100),88);assert.equal(assetRadius(null,100),0);
 const tiles=treemap([{key:'A',value:60},{key:'B',value:30},{key:'현금',value:10}],0,0,100,100);
 assert.equal(tiles.length,3);for(const t of tiles)assert.ok(Math.abs(t.w*t.h-100*t.value)<1e-8);
 assert.equal(composition({total:100,components:{A:110,'현금':-10}},['A','현금']),null);
 assert.equal(composition({total:null,components:null},['A']),null);
});
test('weekly sampling retains endpoints and missing intervals',()=>{
 const rows=[{date:'2026-11-20',total:10,index:100},{date:'2026-11-21',total:null,index:null},{date:'2026-11-22',total:11,index:101},{date:'2026-11-23',total:12,index:102}];
 assert.deepEqual(sampleTimeline(rows,'month').map(r=>r.date),['2026-11-20','2026-11-21','2026-11-23']);
});
test('same-date stock comparison, currency conversion, no missing data fabricated',()=>{
 const market=indexRows([{ticker:'TSLA',date:'2026-11-20',close:100},{ticker:'TSLA',date:'2026-11-23',close:120},{ticker:'USDKRW',date:'2026-11-20',close:1000},{ticker:'USDKRW',date:'2026-11-23',close:1100}]);
 assert.ok(Math.abs(priceChange(market,'TSLA','2026-11-20','2026-11-23','KRW')-32)<1e-8);
 assert.equal(priceChange(market,'QLD','2026-11-20','2026-11-23'),null);
 const r=comparisonRows([{date:'2026-11-20',index:100,ndx:100},{date:'2026-11-23',index:110,ndx:105}],market,['TSLA','QLD'],'USD');
 assert.equal(r[1].portfolio,10);assert.equal(r[1].ndx,5);assert.equal(r[1]['stock:QLD'],null);
 assert.equal(reviewTrade({symbol:'TSLA',date:'2026-11-24',price:100},market,'2026-11-24'),null);
});
