import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewLedgerReadiness} from '../src/sync/ledger-readiness-review.mjs';
const columns=[{column_name:'id',data_type:'uuid',is_nullable:'NO'}];
test('consolidated report remains blocked even with clean data and matching column name',()=>{
 const ledger={transactions:[{id:'a',amount:'100',trade_date:'2026-11-16'}]};
 const before=JSON.stringify(ledger),report=reviewLedgerReadiness(ledger,{columns});
 assert.equal(report.values.issueCount,0);assert.equal(report.mapping.mapped[0].sourceField,'id');
 assert.equal(report.readyForServerWrite,false);assert.equal(report.canPost,false);assert.equal(report.canSync,false);
 assert.equal(report.checks.at(-1).status,'NOT_VERIFIED');assert.equal(JSON.stringify(ledger),before);
});
test('missing or malformed schema does not authorize writes',()=>{
 const ledger={transactions:[{amount:'oops'}]};
 const missing=reviewLedgerReadiness(ledger);assert.equal(missing.checks[2].status,'NOT_CHECKED');assert.equal(missing.values.issueCount,1);
 const invalid=reviewLedgerReadiness(ledger,{columns:[{}]});assert.equal(invalid.checks[2].status,'REVIEW_REQUIRED');assert.equal(invalid.canPost,false);
 const absent=reviewLedgerReadiness({accounts:[]});assert.equal(absent.checks[1].status,'BLOCKED');
});
test('offline readiness UI uses local data only',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/id="ledger-readiness-review"/);assert.match(html,/reviewLedgerReadiness\(current/);
 assert.match(html,/li.textContent=check.name/);assert.match(html,/DB 실측 및 사용자 격리 미검증 · 서버 저장 차단/);
});
