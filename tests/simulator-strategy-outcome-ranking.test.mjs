import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {rankStrategyOutcomes,compareRankedOutcomes} from '../src/simulator/strategy-outcome-ranking.mjs';
const scenarios=[{name:'A',terminalValue:120,final:{cash:10,positions:{TSLA:{quantity:4}}}},{name:'B',terminalValue:100,final:{cash:80,positions:{TSLA:{quantity:9}}}},{name:'C',terminalValue:120,final:{cash:5,positions:{TSLA:{quantity:2}}}}];
test('rank strategies by value TSLA or cash without changing original array',()=>{assert.deepEqual(rankStrategyOutcomes(scenarios,'value').map(s=>s.name),['A','C','B']);assert.deepEqual(rankStrategyOutcomes(scenarios,'tsla').map(s=>s.name),['B','A','C']);assert.deepEqual(rankStrategyOutcomes(scenarios,'cash').map(s=>s.name),['B','A','C']);assert.equal(scenarios[0].name,'A');});
test('invalid criterion is rejected',()=>assert.throws(()=>rankStrategyOutcomes(scenarios,'unknown'),/invalid/));
test('UI allows criterion switch and parses',()=>{const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');assert.match(html,/rankStrategyOutcomes\(result\.scenarios\.map/);assert.match(html,/strategyRankCriterion=criterionSelect\.value;renderRankedCards\(\)/);assert.match(html,/TSLA 보유수량 많은 순/);const scripts=[...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)];assert.ok(scripts.length);for(const m of scripts){if(!m[1].trim())continue;const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:m[1],encoding:'utf8'});assert.equal(r.status,0,r.stderr);}});

test('rank leader deltas respect active sorting, ties, and missing data',()=>{
 const value=compareRankedOutcomes(rankStrategyOutcomes(scenarios,'value'));
 assert.deepEqual(value.map(x=>x.valueDelta),[0,0,-20]);
 assert.deepEqual(value.map(x=>x.tslaDelta),[0,-2,5]);
 assert.deepEqual(value.map(x=>x.cashDelta),[0,-5,70]);
 const cash=compareRankedOutcomes(rankStrategyOutcomes(scenarios,'cash'));
 assert.deepEqual(cash.map(x=>x.cashDelta),[0,-70,-75]);
 assert.deepEqual(compareRankedOutcomes([]),[]);
 assert.equal(compareRankedOutcomes([{terminalValue:NaN,final:{cash:0,positions:{}}}])[0].valueDelta,null);
});
test('UI displays active rank leader differences',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/compareRankedOutcomes\(ranked\)/);
 assert.match(html,/1위 전략 대비 평가총액/);
 assert.match(html,/1위 전략 대비 TSLA 수량/);
 assert.match(html,/1위 전략 대비 현금/);
});

test('ranked strategy cards keep leader deltas visible and move secondary metrics into details',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/secondary\.className='strategy-outcome-more'/);
 assert.match(html,/moreTitle\.textContent='세부 성과 펼치기'/);
 assert.match(html,/label==='세금 반영 추정 평가총액 USD'\|\|label==='1위 대비 세금 반영 평가총액 차이 USD'\)card\.append\(metric\)/);
 assert.match(html,/card\.append\(secondary\)/);
 assert.match(html,/strategy-outcome-card details>summary/);
});

test('ranked leader is labelled, and detailed table clarifies original strategy order',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/card\.classList\.add\('is-rank-leader'\)/);
 assert.match(html,/criterionSelect\.selectedOptions\[0\]\.textContent/);
 assert.match(html,/전체 전략 상세 비교표 보기 \(평가총액·세금 포함\) · 입력 순서/);
 assert.match(html,/전체 상세 비교표는 입력한 전략 순서를 유지합니다/);
});

test('first-strategy valuation summary is displayed once, not duplicated in result section',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/id="quickResults"/);
 assert.match(html,/id="resultHero" class="result-hero" hidden aria-hidden="true"/);
 assert.doesNotMatch(html,/const hero=byId\('resultHero'\);hero\.replaceChildren\(\)/);
 assert.match(html,/quick\.hidden=false/);
});

test('detailed strategy comparison retains metric names while horizontally scrolling on mobile',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/strategy-full-comparison \.strategy-overview-table th:first-child/);
 assert.match(html,/position:sticky;left:0/);
 assert.match(html,/표가 넓으면 좌우로 스크롤하세요/);
 assert.match(html,/fullComparison\.append\(scrollHint\)/);
 assert.match(html,/fullComparison\.append\(fullTable\)/);
});

test('strategy search filters ranked cards without changing leader baseline or full comparison',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/nameFilter\.type='search'/);
 assert.match(html,/nameFilter\.addEventListener\('input',renderRankedCards\)/);
 assert.match(html,/ranked\.map\(\(sc,rankIndex\)=>\(\{sc,rankIndex\}\)\)\.filter/);
 assert.match(html,/const leaderDeltas=compareRankedOutcomes\(ranked\)/);
 assert.match(html,/for\(const \{sc,rankIndex\} of visible\)/);
 assert.match(html,/검색 결과가 없습니다/);
 assert.match(html,/fullComparison\.append\(fullTable\)/);
});

test('strategy search can be reset without changing ranking criterion',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/clearFilter\.textContent='검색 초기화'/);
 assert.match(html,/clearFilter\.disabled=!nameFilter\.value\.length/);
 assert.match(html,/clearFilter\.addEventListener\('click',\(\)=>\{nameFilter\.value='';renderRankedCards\(\);nameFilter\.focus\(\);\}\)/);
 assert.match(html,/strategyRankCriterion=criterionSelect\.value;renderRankedCards\(\)/);
});

test('strategy search is retained after recalculation and can be cleared with Escape',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/let strategyNameQuery=''/);
 assert.match(html,/nameFilter\.value=strategyNameQuery/);
 assert.match(html,/strategyNameQuery=nameFilter\.value/);
 assert.match(html,/event\.key==='Escape'&&nameFilter\.value/);
 assert.match(html,/event\.preventDefault\(\)/);
});

test('ranked cards show absolute terminal valuation and tax-adjusted estimate',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/scenarioTaxByRef=new Map\(result\.scenarios\.map\(\(sc,i\)=>\[sc\.name,taxResults\[i\]\]\)\)/);
 assert.match(html,/sc\.terminalValue-taxResults\[i\]\.incrementalTaxKrw\/fx/);
 assert.match(html,/\['최종 평가총액 USD',fmt\(sc\.terminalValue\)\]/);
 assert.match(html,/\['세금 반영 추정 평가총액 USD',taxAdjustedValue===null\?'산출 불가':fmt\(taxAdjustedValue\)\]/);
 assert.match(html,/label==='세금 반영 추정 평가총액 USD'\|\|label==='1위 대비 세금 반영 평가총액 차이 USD'\)card\.append\(metric\)/);
});

test('tax impact is disclosed in the expanded strategy detail without changing cash',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/taxImpactUsd=Number\.isFinite\(estimatedTaxKrw\)/);
 assert.match(html,/\['추가 예상세액 환산 USD',taxImpactUsd===null\?'산출 불가':signed\(taxImpactUsd\)\]/);
 assert.match(html,/else secondary\.append\(metric\)/);
 assert.match(html,/세액은 가상 현금에서 실제 차감하지 않으며/);
});

test('tax-adjusted comparison uses the actual ranked leader, not filtered search leader',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/leaderTaxAdjusted=taxAdjustedByRef\.get\(ranked\[0\]\?\.name\)/);
 assert.match(html,/signed\(taxAdjustedValue-leaderTaxAdjusted\)/);
 assert.match(html,/taxAdjustedValue===null\|\|leaderTaxAdjusted===null\?'산출 불가'/);
 assert.match(html,/1위 대비 세금 반영 평가총액 차이 USD/);
});

test('tax-adjusted criterion ranks computed values and puts unavailable values last',()=>{
 const input=[{name:'A',taxAdjustedValue:90},{name:'B',taxAdjustedValue:110},{name:'C',taxAdjustedValue:null}];
 assert.deepEqual(rankStrategyOutcomes(input,'taxAdjusted').map(s=>s.name),['B','A','C']);
 assert.equal(input[0].name,'A');
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/세금 반영 평가총액 높은 순/);
 assert.match(html,/taxAdjustedValue:Number\.isFinite\(taxResults\[i\]/);
});

test('strategy cards show pre-tax and tax-adjusted ranking movement independent of active sorting',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/preTaxRanks=new Map\(rankStrategyOutcomes\(ranked,'value'\)/);
 assert.match(html,/afterTaxRanks=new Map\(rankStrategyOutcomes\(ranked,'taxAdjusted'\)/);
 assert.match(html,/Number\.isFinite\(sc\.taxAdjustedValue\)\?i\+1:null/);
 assert.match(html,/세전 /);
 assert.match(html,/세금 반영 /);
 assert.match(html,/단계 상승/);
 assert.match(html,/단계 하락/);
 assert.match(html,/for\(const \{sc,rankIndex\} of visible\)/);
});
