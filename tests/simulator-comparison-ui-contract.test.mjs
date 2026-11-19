import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
test('strategy comparison has cash, TSLA quantity and valuation metrics',()=>{
 for(const label of ['시작 대비 현금 증감 USD','TSLA 최초 대비 수량 증감 (주)','보유 대비 차이 USD','보유 대비 차이 (%)','세금 반영 추정 평가총액 USD'])assert.ok(html.includes(label),label);
});
test('comparison highlighting uses metric labels instead of row positions',()=>{
 assert.match(html,/highlightedRows=new Map/);
 assert.match(html,/highlightedRows\.get\(row\.cells\[0\]\?\.textContent\)/);
 assert.doesNotMatch(html,/for\(const rowIndex of \[/);
});
test('stepwise table exposes cash movement and TSLA share delta',()=>{
 for(const label of ['단계 현금 증감 USD','거래 후 현금 USD','TSLA 최초 대비 증감 (주)'])assert.ok(html.includes(label),label);
});
