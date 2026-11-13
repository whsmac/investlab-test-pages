import test from 'node:test';import assert from 'node:assert/strict';import {buildTestFinalReport} from '../src/ledger/test-final-report.mjs';
test('missing link blocks report',()=>assert.throws(()=>buildTestFinalReport({createdAt:'2026-11-13T00:00:00Z'}),/link/));
test('invalid date blocks report',()=>assert.throws(()=>buildTestFinalReport({createdAt:'invalid'}),/date/));
test('unsafe link blocks report',()=>assert.throws(()=>buildTestFinalReport({createdAt:'2026-11-13T00:00:00Z',link:{canMigrate:true}}),/unsafe/));
