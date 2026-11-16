import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPortfolioSyncEnvelope,buildLedgerSyncEnvelope,previewPersonalSyncEnvelope} from '../src/sync/personal-sync-adapters.mjs';
const user='11111111-1111-4111-8111-111111111111';
const doc='33333333-3333-4333-8333-333333333333';
const opts={authenticatedUserId:user,documentId:doc,revision:0,updatedAt:'2026-11-16T01:00:00Z'};
function storage(values){
 const map=new Map(Object.entries(values));
 return {getItem(key){return map.has(key)?map.get(key):null;}};
}
test('portfolio adapter reads existing keys without modifying storage',()=>{
 const source=storage({investlab_holdings:JSON.stringify([{ticker:'TSLA',quantity:10}]),investlab_watchlist:'[]'});
 const envelope=buildPortfolioSyncEnvelope(source,opts);
 assert.equal(envelope.kind,'portfolio');
 assert.equal(envelope.payload.holdings[0].ticker,'TSLA');
 assert.deepEqual(previewPersonalSyncEnvelope(envelope,{authenticatedUserId:user}).counts,{holdings:1,watchlist:0,past:0});
 assert.equal(previewPersonalSyncEnvelope(envelope,{authenticatedUserId:user}).canPost,false);
});
test('portfolio adapter rejects malformed stored JSON rather than silently losing data',()=>{
 assert.throws(()=>buildPortfolioSyncEnvelope(storage({investlab_holdings:'{'}),opts),SyntaxError);
 assert.throws(()=>buildPortfolioSyncEnvelope(storage({investlab_holdings:'{}'}),opts),/배열/);
});
test('ledger adapter preserves input JSON without modifying it and rejects mismatched owner',()=>{
 const ledger={transactions:[{id:'t1',amount:100}]};
 const envelope=buildLedgerSyncEnvelope(ledger,opts);
 assert.deepEqual(envelope.payload.ledger,ledger);
 assert.equal(previewPersonalSyncEnvelope(envelope,{authenticatedUserId:user}).counts.ledgerPresent,true);
 assert.throws(()=>previewPersonalSyncEnvelope(envelope,{authenticatedUserId:'22222222-2222-4222-8222-222222222222'}),/소유자/);
 assert.throws(()=>buildLedgerSyncEnvelope([],opts),/객체/);
});
test('adapter never provides network write methods',()=>{
 assert.equal('save' in buildPortfolioSyncEnvelope(storage({}),opts),false);
});

test('portfolio diagnostic offers offline-only conversion preview without network upload',()=>{
 const html=readFileSync(new URL('../portfolio-connection-check.html',import.meta.url),'utf8');
 assert.match(html,/id="previewSync"/);
 assert.match(html,/buildPortfolioSyncEnvelope\(localStorage/);
 assert.match(html,/previewPersonalSyncEnvelope\(envelope/);
 assert.match(html,/TEST 가상 ID · 실제 로그인 인증 아님 · 서버 저장 차단/);
 assert.doesNotMatch(html,/\.from\(['"](?:portfolio|ledger)/);
});

test('ledger preview uses validated offline envelope without enabling server writes',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/id="ledger-sync-preview"/);
 assert.match(html,/buildLedgerSyncEnvelope\(current/);
 assert.match(html,/previewPersonalSyncEnvelope\(envelope/);
 assert.match(html,/TEST 가상 ID · 실제 로그인 인증 아님 · 서버 저장 차단/);
 assert.match(html,/if\(!current\)throw Error\('먼저 원장 데이터를 불러오세요'\)/);
});
