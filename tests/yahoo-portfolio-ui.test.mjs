import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const html=readFileSync(new URL("../test-my-portfolio-ledger.html",import.meta.url),"utf8");
test("TEST portfolio exposes opt-in Yahoo price fill",()=>{
 assert.match(html,/id="yahoo-price-fill"/);
 assert.match(html,/loadPublishedYahooReview\(\{origin:location\.href\}\)/);
 assert.match(html,/previewYahooPortfolioPriceFill\(snapshot,view\.holdings,prices\)/);
 assert.match(html,/for\(const \[ticker,price\] of updates\)setAssumedPrice/);
 assert.match(html,/if\(updates\.length\)\{/);
 assert.match(html,/el\('portfolio-price-calc'\)\.click\(\)/);
 assert.match(html,/button\\.disabled=true/);
 assert.match(html,/if\\(current!==initialLedger\\|\\|el\\('account'\\)\\.value!==initialAccount\\)/);
 assert.match(html,/view\\.holdings\\.map\\(h=>h\\.ticker\\)\\.join\\('\\|'\\)!==initialTickers/);
 assert.match(html,/priceRows\\.length!==view\\.holdings\\.length/);
 assert.match(html,/finally\{button\.disabled=false;\}/);
});
test("portfolio module remains valid JavaScript",()=>{
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match);
 const result=spawnSync(process.execPath,["--check","--input-type=module"],{input:match[1],encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
});
