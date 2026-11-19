import test from 'node:test';import assert from 'node:assert/strict';
import {assessPreflightWithCatalog} from '../src/ledger/preflight-catalog-integration.mjs';
import {TEST_PREFLIGHT_CHECKS} from '../src/ledger/test-migration-preflight.mjs';
const evidence=Object.fromEntries(TEST_PREFLIGHT_CHECKS.map(c=>[c.id,true]));
const format={format:'INVESTLAB_LEDGER_SECURITY_AUDIT_V1',version:1,scope:'TEST_READ_ONLY_CATALOG'};
test('manual completion without catalog cannot pass',()=>{const r=assessPreflightWithCatalog(evidence);assert.equal(r.status,'BLOCKED');assert.equal(r.catalogStatus,'NOT_PROVIDED')});
test('missing tables force block even if user marked all verified',()=>{const r=assessPreflightWithCatalog(evidence,{...format,tables:[],functions:[]});assert.equal(r.status,'BLOCKED');assert.ok(r.catalogBlockers.length>0)});
test('catalog prerequisite pass does not grant upload or substitute A/B test',()=>{const names=['investlab_accounts','investlab_ledger_events','investlab_ledger_legs','investlab_personal_symbols','investlab_personal_scenarios_v2'];const tables=names.map(table_name=>({table_name,exists:true,rls_enabled:true,anon_select:false,auth_insert:false,auth_update:false,auth_delete:false,policy_count:1}));const functions=[{function_name:'investlab_post_trade_v0',security_definer:true,anon_execute:false,authenticated_execute:true}];const r=assessPreflightWithCatalog(evidence,{...format,tables,functions});assert.equal(r.catalogStatus,'CATALOG_PREREQUISITES_PASSED');assert.equal(r.requiresABUserIsolationTest,true);assert.equal(r.canUpload,false)});
test('invalid audit is rejected, not treated as verified',()=>assert.throws(()=>assessPreflightWithCatalog(evidence,'{}')));
