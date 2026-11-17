import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const html=readFileSync(new URL("../test-my-portfolio-ledger.html",import.meta.url),"utf8");
test("TEST portfolio exposes opt-in non-mutating Yahoo valuation preview",()=>{
 assert.match(html,/id="yahoo-valuation-preview"/);
 assert.match(html,/id="yahoo-valuation-preview-result"/);
 assert.match(html,/import \{previewYahooPortfolioValuation\}/);
 assert.match(html,/previewYahooPortfolioValuation\(\{/);
 assert.match(html,/snapshot,holdings:currentView\.holdings,accounts:selectedValuationAccounts\(currentView\),assumedPrices/);
 assert.match(html,/if\(current!==initialLedger\|\|el\('account'\)\.value!==initialAccount\)/);
 assert.match(html,/원장·입력값·서버 저장 변경 없음/);
});
test("portfolio embedded module syntax is valid",()=>{
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match);
 const result=spawnSync(process.execPath,["--check","--input-type=module"],{input:match[1],encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
});
