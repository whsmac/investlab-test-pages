import test from 'node:test';import assert from 'node:assert/strict';import {describeOpeningInputError as describe} from '../src/ledger/opening-input-guidance.mjs';
test('JSON syntax points to named field',()=>{const r=describe(new SyntaxError('Unexpected end of JSON input'),{field:'cash'});assert.match(r.message,/현금잔고/);assert.match(r.action,/괄호/)});
test('duplicate points to account-asset pair',()=>assert.match(describe(Error('duplicate position')).action,/계좌·종목/));
test('account identifier points to account registration',()=>assert.match(describe(Error('unknown accountId')).action,/계좌를 먼저/));
test('ownership requires explicit confirmation',()=>assert.match(describe(Error('ownerConfirmed false')).action,/확인한 뒤/));
test('quantity explains eight decimal limit',()=>assert.match(describe(Error('invalid quantity')).action,/8자리/));
test('unknown errors are safely bounded',()=>assert.ok(describe(Error('X'.repeat(500))).action.length<250));
