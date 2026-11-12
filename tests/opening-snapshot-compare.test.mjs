import test from 'node:test';import assert from 'node:assert/strict';
import {compareOpeningSnapshots} from '../src/ledger/opening-snapshot-compare.mjs';
const a='123e4567-e89b-12d3-a456-426614174000',b='123e4567-e89b-12d3-a456-426614174001';
const source={positions:[{accountId:a,ticker:'USD',quantity:'107',averageCostUsd:'83.6'},{accountId:b,ticker:'TSLA',quantity:'2',averageCostUsd:'385.2'}],cash:[{accountId:a,currency:'USD',balance:'1000'},{accountId:a,currency:'KRW',balance:'50000'}]};
test('account-scoped holdings and cash compare exactly',()=>{const r=compareOpeningSnapshots(source,structuredClone(source));assert.equal(r.status,'ALL_MATCH');assert.equal(r.rows.length,4)});
test('USD ETF and USD cash remain separate',()=>{const r=compareOpeningSnapshots(source,{...source,positions:[{...source.positions[0],quantity:'108'},source.positions[1]]});assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.rows.filter(x=>x.status==='DIFFERENT').length,1);assert.ok(r.rows.some(x=>x.key.includes('|cash|USD')&&x.status==='MATCH'))});
test('missing and extra cash accounts detected',()=>{const r=compareOpeningSnapshots(source,{positions:source.positions,cash:[source.cash[0],{accountId:b,currency:'KRW',balance:'1'}]});assert.ok(r.rows.some(x=>x.status==='MISSING'));assert.ok(r.rows.some(x=>x.status==='EXTRA'))});
test('same ticker in another account does not merge',()=>{const r=compareOpeningSnapshots(source,{...source,positions:[{...source.positions[0],accountId:b},source.positions[1]]});assert.equal(r.status,'REVIEW_REQUIRED')});
