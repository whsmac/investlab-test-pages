import test from 'node:test';import assert from 'node:assert/strict';import {describeOneClickReviewFailure as guide} from '../src/ledger/one-click-review-guidance.mjs';
test('table errors point to editable values',()=>assert.match(guide({stage:'table'}).action,/배정수량/));
test('ledger errors identify reconciliation step',()=>assert.match(guide({stage:'ledger'}).title,/원장/));
test('final errors require ownership and cost',()=>assert.match(guide({stage:'final'}).action,/계좌 소유/));
test('guidance never grants posting',()=>{const r=guide({stage:'other',detail:'x'.repeat(1000)});assert.equal(r.canPost,false);assert.equal(r.detail.length,500)});
