import test from 'node:test';import assert from 'node:assert/strict';
import {parseStandardSecurityAudit} from '../src/ledger/standard-security-audit.mjs';
const base={format:'INVESTLAB_LEDGER_SECURITY_AUDIT_V1',version:1,scope:'TEST_READ_ONLY_CATALOG',tables:[],functions:[]};
test('standard SQL JSON is parsed and classified as missing tables',()=>{const r=parseStandardSecurityAudit(JSON.stringify(base));assert.equal(r.assessment.missingTables.length,5);assert.equal(r.assessment.canMigrate,false)});
test('SQL editor exported row accepted',()=>assert.equal(parseStandardSecurityAudit(JSON.stringify([{audit_json:base}])).assessment.missingTables.length,5));
test('invalid format or missing arrays rejected',()=>{assert.throws(()=>parseStandardSecurityAudit('{}'));assert.throws(()=>parseStandardSecurityAudit({...base,tables:null}));assert.throws(()=>parseStandardSecurityAudit('not-json'))});
