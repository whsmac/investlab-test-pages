import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
test('TEST ledger handoff excludes stale browser cash and discloses unknown cash',()=>{
 const start=html.indexOf('byId("testOnlineSimulatorApply").addEventListener');
 const end=html.indexOf('function portfolioJson()',start);
 assert.ok(start>=0&&end>start);
 const handler=html.slice(start,end);
 assert.match(handler,/byId\("cash"\)\.value="0"/);
 assert.match(handler,/기존 시작 현금은 0으로 초기화/);
 assert.match(handler,/미확인 임시값/);
 assert.match(handler,/실제 원장 변경 없음/);
 assert.ok(handler.indexOf('byId("cash").value="0"')<handler.indexOf('renderPortfolio()'));
});
