import test from 'node:test';import assert from 'node:assert/strict';
import {createOpeningReviewReport} from '../src/ledger/opening-review-report.mjs';
const id='123e4567-e89b-12d3-a456-426614174000';
const data={positions:[{accountId:id,ticker:'USD',quantity:'107',averageCostUsd:'83.6'}],cash:[{accountId:id,currency:'USD',balance:'1000'},{accountId:id,currency:'KRW',balance:'50000'}]};
const all={accountOwnership:true,historicalCostBasis:true,cashBalances:true};
test('complete report includes row-level comparison and no upload authorization',()=>{const r=createOpeningReviewReport(data,data,all);assert.equal(r.status,'READY_FOR_TEST_REVIEW');assert.equal(r.summary.matchCount,3);assert.equal(r.uploadAuthorized,false);assert.equal(r.rows.length,3)});
test('unconfirmed cost basis stays blocked and recorded',()=>{const r=createOpeningReviewReport(data,data,{...all,historicalCostBasis:false});assert.equal(r.status,'BLOCKED');assert.deepEqual(r.missingConfirmations,['historicalCostBasis'])});
test('cash difference appears in exported review',()=>{const r=createOpeningReviewReport(data,{...data,cash:[{...data.cash[0],balance:'999'},data.cash[1]]},all);assert.equal(r.summary.differenceCount,1);assert.equal(r.differences[0].status,'DIFFERENT')});
