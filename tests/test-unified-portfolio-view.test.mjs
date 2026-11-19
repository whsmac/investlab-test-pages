import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
test('TEST unified portfolio shows weighted holdings and excludes unverified cash',()=>{
 const start=html.indexOf('$("testUnifiedPortfolio").onclick=async()=>{');
 const end=html.indexOf('$("testAccountHoldings").onclick=async()=>{',start);
 assert.ok(start>=0&&end>start);
 const section=html.slice(start,end);
 assert.match(section,/readMyLedgerAll\(source/);
 assert.match(section,/buildTestAccountHoldings\(result.rows\)/);
 assert.match(section,/summarizeTestAllAccounts\(breakdown\)/);
 assert.match(section,/현금잔고 미확인 · 총자산 미산출/);
 assert.doesNotMatch(section,/\.insert\(|\.update\(|\.upsert\(/);
});
test('unified portfolio button is gated by verified login',()=>{
 assert.match(html,/id="testUnifiedPortfolio" type="button" disabled/);
 assert.match(html,/\$\("testUnifiedPortfolio"\)\.disabled = !verifiedUserId/);
});
