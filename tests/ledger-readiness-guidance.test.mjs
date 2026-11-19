import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewLedgerWithGuidance} from '../src/sync/ledger-readiness-guidance.mjs';
test('guidance explains format errors without changing original data',()=>{
 const ledger={transactions:[{amount:'1,000',trade_date:'2026-02-30'}]};const before=JSON.stringify(ledger);
 const report=reviewLedgerWithGuidance(ledger);
 assert.equal(report.examples.length,2);assert.equal(report.actions.length,5);
 assert.equal(report.canPost,false);assert.equal(report.canSync,false);assert.equal(report.readyForServerWrite,false);
 assert.equal(JSON.stringify(ledger),before);
});
test('clean data still requires DB and isolation verification',()=>{
 const report=reviewLedgerWithGuidance({transactions:[{amount:10,trade_date:'2026-11-16'}]});
 assert.equal(report.examples.length,0);assert.equal(report.actions.at(-1).needsAttention,true);
 assert.equal(report.mode,'OFFLINE_GUIDANCE_ONLY');
});
test('guidance UI renders text and does not save',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/id="ledger-guidance-review"/);assert.match(html,/reviewLedgerWithGuidance\(current/);
 assert.match(html,/li.textContent=item.name/);assert.match(html,/원본 변경 없음 · 서버 저장 차단/);
});
