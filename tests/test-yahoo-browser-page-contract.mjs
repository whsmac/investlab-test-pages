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
 assert.match(html,/published=null;sourceMode="file"/);
});
test("TEST page contains no DB mutation calls",()=>{
 assert.doesNotMatch(html,/\.insert\(|\.upsert\(|\.update\(|\.delete\(|\.rpc\(/);
});
