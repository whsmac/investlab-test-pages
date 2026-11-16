import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../test-yahoo-price-review.html",import.meta.url),"utf8");
test("published JSON has a visible action and read-only comparison",()=>{
 assert.match(html,/id="auto"/);
 assert.match(html,/loadPublishedYahooReview\(\{origin:location\.href\}\)/);
 assert.match(html,/reviewYahooCandidate\(candidate,snapshot,companyMap\)/);
});
test("auto load overrides previously selected local file",()=>{
 assert.match(html,/sourceMode="published";\$\("file"\)\.value=""/);
 assert.match(html,/sourceMode==="published"\?null:/);
});
test("manual file selection cancels stale published candidate",()=>{
 assert.match(html,/\$\("file"\)\.addEventListener\("change"/);
 assert.match(html,/published=null;\$\("chart"\)\.replaceChildren\(\);\$\("freshness"\)\.textContent="선택한 파일 미리보기 전";sourceMode="file"/);
});
test("TEST page contains no DB mutation calls",()=>{
 assert.doesNotMatch(html,/\.insert\(|\.upsert\(|\.update\(|\.delete\(|\.rpc\(/);
});

test("standalone Yahoo chart preview does not require TEST login",()=>{
 assert.match(html,/id="preview"/);
 const start=html.indexOf('$("preview").addEventListener');
 const end=html.indexOf('$("run").addEventListener',start);
 const handler=html.slice(start,end);
 assert.match(handler,/renderReviewCharts\(source\)/);
 assert.doesNotMatch(handler,/getTestClient|readTestPriceSnapshot|readYahooTestCompanyMap/);
});

test("public Yahoo chart auto-loads on startup without authentication",()=>{
 assert.match(html,/void autoLoadYahooReview\(\)/);
 assert.match(html,/\$\("auto"\)\.addEventListener\("click",autoLoadYahooReview\)/);
});
test("manual file selection cannot be overwritten by an earlier pending auto fetch",()=>{
 assert.match(html,/const revision=\+\+sourceRevision/);
 assert.match(html,/if\(revision!==sourceRevision\)return/);
 assert.match(html,/sourceRevision\+\+;published=null/);
});

test("Yahoo freshness indicator exists before chart render",()=>{
 assert.match(html,/id="freshness"/);
 assert.match(html,/assessYahooChartFreshness\(snapshot\)/);
});
