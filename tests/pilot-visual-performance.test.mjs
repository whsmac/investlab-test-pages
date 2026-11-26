import test from 'node:test';
import assert from 'node:assert/strict';
import {assetRadius,treemap,composition,sampleTimeline,priceChange,comparisonRows,reviewTrade,periodSummary,defaultHeatMode,heatPeriods,heatReturn,quotedPrice,drawdownRows,drawdownSummary} from '../src/market/pilot-visual-performance.mjs';
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

test('period summary separates contribution from investment gain and discloses incomplete start or broken return',()=>{
 const rows=[{date:'2026-01-01',total:null,index:null,missing:['ABC']},{date:'2026-01-02',total:1000,index:100,capital:1000,ndx:100,spx:100},{date:'2026-01-03',total:1350,index:105,capital:1300,ndx:103,spx:107},{date:'2026-01-04',total:null,index:null,missing:['ABC']},{date:'2026-01-05',total:1400,index:null,capital:1300}];
 assert.deepEqual(periodSummary(rows,'2026-01-03'),{baseDate:'2026-01-02',selectedDate:'2026-01-03',validDays:2,days:3,assetChange:350,netFlow:300,investmentGain:50,returnPct:5,ndxExcess:2,spxExcess:-2,missing:[]});
 assert.equal(periodSummary(rows,'2026-01-05').returnPct,null);
 assert.equal(periodSummary(rows,'2026-01-05').investmentGain,100);
 assert.equal(periodSummary(rows,'2026-01-01').investmentGain,null);
 const market=indexRows([{ticker:'ABC',date:'2026-01-01',close:5},{ticker:'ABC',date:'2026-01-02',close:10},{ticker:'ABC',date:'2026-01-03',close:12}]);
 const compare=comparisonRows(rows.slice(0,3),market,['ABC'],'USD','2026-01-02');assert.equal(compare[0]['stock:ABC'],null);assert.ok(Math.abs(compare[2]['stock:ABC']-20)<1e-8);
});

test('period heatmap uses independent close-to-close returns, skips non-trading dates and respects FX',()=>{
 const rows=['2026-01-02','2026-01-03','2026-01-04','2026-01-05','2026-01-06'].map(date=>({date}));
 const market=indexRows([{ticker:'AAA',date:'2025-12-31',close:100},{ticker:'AAA',date:'2026-01-02',close:110},{ticker:'AAA',date:'2026-01-05',close:99},{ticker:'AAA',date:'2026-01-06',close:108.9},{ticker:'USDKRW',date:'2025-12-31',close:1000},{ticker:'USDKRW',date:'2026-01-02',close:1100},{ticker:'USDKRW',date:'2026-01-05',close:1000}]);
 const days=heatPeriods(rows,market,['AAA'],'day');assert.deepEqual(days.map(p=>p.start),['2026-01-02','2026-01-05','2026-01-06']);
 assert.ok(Math.abs(heatReturn(market,'AAA',days[0]).change-10)<1e-8);
 assert.ok(Math.abs(heatReturn(market,'AAA',days[1]).change+10)<1e-8);
 assert.ok(Math.abs(heatReturn(market,'AAA',days[0],'KRW').change-21)<1e-8);
 assert.equal(heatReturn(market,'MISSING',days[0]),null);
 assert.equal(heatReturn(market,'AAA',{start:'2026-01-03',end:'2026-01-04'}),null);
 const weeks=heatPeriods(rows,market,['AAA'],'week');assert.equal(weeks.length,2);
 assert.ok(Math.abs(heatReturn(market,'AAA',weeks[1]).change+1)<1e-8);
 assert.ok(Math.abs(heatReturn(market,'AAA',heatPeriods(rows,market,['AAA'],'month')[0]).change-8.9)<1e-8);
 assert.equal(defaultHeatMode(rows),'day');assert.equal(defaultHeatMode(Array(32)),'week');assert.equal(defaultHeatMode(Array(94)),'month');
});

test('drawdown uses each running high, selected date only, and flags gaps',()=>{
 const rows=drawdownRows([{date:'2026-01-01',index:100,ndx:100,spx:100},{date:'2026-01-02',index:150,ndx:110,spx:120},{date:'2026-01-03',index:90,ndx:99,spx:120},{date:'2026-01-04',index:120,ndx:null,spx:110}]);
 const s=drawdownSummary(rows,'2026-01-04');assert.equal(s.mdd,-40);assert.equal(s.mddDate,'2026-01-03');assert.ok(Math.abs(s.current+20)<1e-8);assert.ok(Math.abs(s.recovery-25)<1e-8);assert.equal(s.complete,true);
 assert.equal(drawdownSummary(rows,'2026-01-02').mdd,0);assert.equal(drawdownSummary(rows,'2026-01-04','ndx').complete,false);assert.equal(rows[3].ndx,null);
});
test('mixed price display does not alter USD quote or KRW valuation basis',()=>{
 const market=indexRows([{ticker:'TSLA',date:'2026-01-01',close:100,as_traded_close:200},{ticker:'USDKRW',date:'2026-01-01',close:1300}]);
 assert.equal(quotedPrice(market,'TSLA','2026-01-01','USD'),200);assert.equal(quotedPrice(market,'TSLA','2026-01-01','KRW'),260000);assert.equal(quotedPrice(market,'TSLA','2026-01-01','KRW',150),195000);assert.equal(quotedPrice(market,'TSLA','2026-02-01','USD'),null);
});
