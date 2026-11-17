import test from "node:test";
import assert from "node:assert/strict";
import {loadPublishedYahooReview} from "../src/market/load-published-yahoo-review.mjs";

const origin = "https://whsmac.github.io/investlab-test-pages/test-my-portfolio-ledger.html";
function fetchResult(status, contentType="application/json", body={}) {
  return async (url, options) => {
    assert.equal(url,"https://whsmac.github.io/investlab-test-pages/data/yahoo-public-review.json");
    assert.equal(options.cache,"no-store");
    assert.equal(options.credentials,"omit");
    return {ok:status===200,status,headers:{get:()=>contentType},json:async()=>body};
  };
}
const snapshot={mode:"REVIEW_ONLY",source:"Yahoo Finance",database_insert_authorized:false,
  writes_performed:0,row_count:1,observations:[{ticker:"TSLA",trading_date:"2026-11-16",close_price:"100"}]};

test("unpublished JSON returns explicit TEST not-ready message",async()=>{
  await assert.rejects(loadPublishedYahooReview({origin,fetcher:fetchResult(404)}),/아직 온라인 TEST에 게시되지 않았습니다/);
});
test("server error is not mistaken for unpublished JSON",async()=>{
  await assert.rejects(loadPublishedYahooReview({origin,fetcher:fetchResult(503)}),/HTTP 503/);
});
test("HTML error response is rejected",async()=>{
  await assert.rejects(loadPublishedYahooReview({origin,fetcher:fetchResult(200,"text/html")}),/JSON이 아닙니다/);
});
test("review-only JSON can be loaded without writes",async()=>{
  assert.deepEqual(await loadPublishedYahooReview({origin,fetcher:fetchResult(200,"application/json",snapshot)}),snapshot);
});
test("write-enabled payload is rejected",async()=>{
  await assert.rejects(loadPublishedYahooReview({origin,fetcher:fetchResult(200,"application/json",{...snapshot,database_insert_authorized:true})}),/검증 실패/);
});
test("untrusted origin is rejected before fetch",async()=>{
  await assert.rejects(loadPublishedYahooReview({origin:"https://example.com/investlab-test-pages/test-my-portfolio-ledger.html",fetcher:()=>{throw Error("fetch must not run");}}),/허용되지 않은 TEST 호스트/);
});
