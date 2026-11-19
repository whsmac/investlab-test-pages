import test from 'node:test';import assert from 'node:assert/strict';
import {parseIsolationEvidenceDocument} from '../src/ledger/isolation-evidence-assessment.mjs';
import {buildIsolationEvidenceTemplate} from '../src/ledger/isolation-evidence-template.mjs';
test('blank template is incomplete',()=>{const r=parseIsolationEvidenceDocument(JSON.stringify(buildIsolationEvidenceTemplate()));assert.equal(r.status,'INCOMPLETE');assert.equal(r.cases.length,8)});
test('missing reference blocks manual completion',()=>{const x=buildIsolationEvidenceTemplate();x.cases[0].observed=x.cases[0].expected;x.cases[0].method='CLIENT_SESSION';const r=parseIsolationEvidenceDocument(x);assert.equal(r.cases[0].status,'EVIDENCE_MISSING')});
test('unexpected cross-account access is failure',()=>{const x=buildIsolationEvidenceTemplate();const c=x.cases.find(c=>c.id==='a_other_read');c.observed='ALLOW';c.method='CLIENT_SESSION';c.evidenceReference='sanitized-log';assert.equal(parseIsolationEvidenceDocument(x).status,'FAILED')});
test('all referenced matches remain manually assessed only',()=>{const x=buildIsolationEvidenceTemplate();for(const c of x.cases){c.observed=c.expected;c.method='CLIENT_SESSION';c.evidenceReference='log-'+c.id}const r=parseIsolationEvidenceDocument(x);assert.equal(r.status,'MANUAL_EVIDENCE_COMPLETE');assert.equal(r.serverVerified,false);assert.equal(r.canMigrate,false)});
test('wrong TEST project fails closed',()=>{const x=buildIsolationEvidenceTemplate();x.projectId='production';assert.throws(()=>parseIsolationEvidenceDocument(x))});
