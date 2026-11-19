import test from "node:test";
import assert from "node:assert/strict";
import {findLatestYahooArtifact} from "../src/market/find-latest-yahoo-artifact.mjs";
const ok=data=>({ok:true,json:async()=>data});
test("finds latest unexpired Yahoo review artifact",async()=>{
 let calls=0;
 const fetcher=async url=>{calls++;return calls===1?ok({workflow_runs:[{id:123,conclusion:"success"}]}):
 ok({artifacts:[{id:456,name:"investlab-test-yahoo-review-candidate",expired:false,created_at:"2026-11-16T00:00:00Z"}]})};
 const result=await findLatestYahooArtifact(fetcher);
 assert.equal(result.artifact_id,456);
 assert.match(result.artifact_url,/artifacts\/456$/);
 assert.equal(calls,2);
});
test("skips expired artifact",async()=>{
 let calls=0;
 const fetcher=async()=>++calls===1?ok({workflow_runs:[{id:123,conclusion:"success"}]}):
 ok({artifacts:[{id:456,name:"investlab-test-yahoo-review-candidate",expired:true}]});
 await assert.rejects(findLatestYahooArtifact(fetcher),/없습니다/);
});
test("rejects GitHub API errors",async()=>{
 await assert.rejects(findLatestYahooArtifact(async()=>({ok:false,status:403})),/403/);
});
test("rejects malformed runs",async()=>{
 await assert.rejects(findLatestYahooArtifact(async()=>ok({workflow_runs:null})),/형식/);
});
