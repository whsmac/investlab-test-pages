import test from 'node:test';
import assert from 'node:assert/strict';
import {checkScenarioRevision,checkScenarioQuota} from '../src/sync/test-scenario-write-guards.mjs';
test('matching revision allows next version',()=>{
 assert.deepEqual(checkScenarioRevision({expectedRevision:2,currentRevision:2}),{allowed:true,status:'matched',nextRevision:3});
});
test('stale revision cannot silently overwrite newer strategy',()=>{
 assert.deepEqual(checkScenarioRevision({expectedRevision:2,currentRevision:3}),{allowed:false,status:'conflict',expectedRevision:2,currentRevision:3});
});
test('invalid revisions rejected',()=>{
 assert.throws(()=>checkScenarioRevision({expectedRevision:0,currentRevision:1}));
 assert.throws(()=>checkScenarioRevision({expectedRevision:1,currentRevision:1.5}));
});
test('quota blocks new strategies at cap but allows updating existing',()=>{
 assert.equal(checkScenarioQuota({existingCount:30,creating:true}).allowed,false);
 assert.equal(checkScenarioQuota({existingCount:30,creating:false}).allowed,true);
 assert.equal(checkScenarioQuota({existingCount:29,creating:true}).allowed,true);
});
