import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {decodeSecSnapshot,loadSecStaticSnapshot,SNAPSHOT_SHA256,SNAPSHOT_PATH} from '../src/market/load-sec-static-snapshot.mjs';
const raw=readFileSync(new URL('../data/sec-financial-review-20261124.txt',import.meta.url));
const html=readFileSync(new URL('../company-investment-analysis.html',import.meta.url),'utf8');
test('actual 117-row reviewed snapshot matches exact pinned SHA and metric counts',()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),SNAPSHOT_SHA256);
 const rows=decodeSecSnapshot(raw.toString('utf8'));
 assert.equal(rows.length,117);
 const statuses={};
 for(const row of rows)for(const s of Object.values(row.metric_status))statuses[s]=(statuses[s]||0)+1;
 assert.deepEqual(statuses,{source_arithmetic_checked:402,definition_review:21,zip_match:43,missing:2});
 const msft=rows.find(r=>r.ticker==='MSFT'&&r.period_end==='2026-09-30');
 assert.deepEqual([msft.revenue_usd_bn,msft.capex_usd_bn,msft.operating_income_usd_bn],[92.279,39.367,45.915]);
 assert.equal(rows.find(r=>r.ticker==='SPCX'&&r.period_end==='2026-06-30').capex_usd_bn,null);
});
test('automatic read-only fetch uses pinned path and rejects tampering or missing files',async()=>{
 const ok=async(path,options)=>{assert.equal(path,SNAPSHOT_PATH);assert.equal(options.credentials,'omit');return new Response(raw);};
 assert.equal((await loadSecStaticSnapshot({fetcher:ok,subtle:webcrypto.subtle})).length,117);
 const tampered=Buffer.from(raw);tampered[1000]^=1;
 await assert.rejects(loadSecStaticSnapshot({fetcher:async()=>new Response(tampered),subtle:webcrypto.subtle}),/식별값/);
 await assert.rejects(loadSecStaticSnapshot({fetcher:async()=>new Response('',{status:404}),subtle:webcrypto.subtle}),/404/);
 await assert.rejects(loadSecStaticSnapshot({fetcher:async()=>new Response('x'),subtle:webcrypto.subtle}),/크기/);
});
test('company page preserves separate modes and uses old financial source on initial snapshot error',()=>{
 const section=html.slice(html.indexOf('async function loadFinance()'),html.indexOf('async function loadAll()'));
 assert.match(section,/await loadSecStaticSnapshot\(\)/);
 assert.match(section,/if\(request!==latestRequest\)return;staticSecReview=checked/);
 assert.match(section,/catch\(error\)\{if\(request!==latestRequest\)return;staticError=/);
 assert.match(section,/if\(localSecReview\|\|\(useStaticSec&&staticSecReview\)\)/);
 assert.ok(section.indexOf('if(localSecReview||(useStaticSec&&staticSecReview))')<section.indexOf('if(!client)await connect()'));
 assert.match(html,/localSecReview=null;useStaticSec=false/);
 assert.match(html,/localSecReview=null;useStaticSec=true/);
 assert.doesNotMatch(section,/\.(upsert|insert|update|rpc)\(/);
});
