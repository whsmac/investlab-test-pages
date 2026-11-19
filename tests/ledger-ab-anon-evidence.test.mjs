import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED_SECURITY_CASES,assessLedgerIsolationEvidence as assess} from '../src/ledger/ledger-ab-anon-evidence.mjs';
const sample=()=>({environment:'TEST',projectRef:'abcdefghijklmnopqrst',sqlVersion:'opening-v2-review',cases:REQUIRED_SECURITY_CASES.map(id=>({id,result:'NOT_RUN'}))});
test('unexecuted TEST A/B/anon evidence never authorizes deployment',()=>{
 const result=assess(sample());
 assert.equal(result.caseCount,16);
 assert.equal(result.status,'INCOMPLETE');
 assert.equal(result.canDeploy,false);
 assert.equal(result.serverVerified,false);
});
test('missing, duplicate, failed or unsupported evidence is surfaced',()=>{
 assert.ok(assess({...sample(),cases:[]}).issues.some(x=>x.includes('missing case')));
 const cases=sample().cases;
 assert.ok(assess({...sample(),cases:[...cases,cases[0]]}).issues.some(x=>x.includes('duplicate case')));
 assert.ok(assess({...sample(),cases:cases.map((c,i)=>i===0?{...c,result:'PASS'}:c)}).issues.some(x=>x.includes('missing observed evidence')));
});
test('complete evidence format still requires independent server verification',()=>{
 const cases=sample().cases.map(c=>({...c,result:'PASS',observed:'Redacted result',timestamp:'2026-11-14T00:00:00Z',eventsBefore:0,eventsAfter:0,legsBefore:0,legsAfter:0}));
 const result=assess({...sample(),cases});
 assert.equal(result.status,'EVIDENCE_FORMAT_COMPLETE_REQUIRES_INDEPENDENT_REVIEW');
 assert.equal(result.canDeploy,false);
});
