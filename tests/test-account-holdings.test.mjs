import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTestAccountHoldings} from '../src/sync/test-account-holdings.mjs';
test('separates two accounts with same ticker and different cost',()=>{
 const rows=[{account_id:'A',transaction_type:'BUY',symbol:'TSLA',quantity:2,unit_price:100,currency:'USD'},
 {account_id:'B',transaction_type:'BUY',symbol:'TSLA',quantity:3,unit_price:200,currency:'USD'}];
 const result=buildTestAccountHoldings(rows);
 assert.equal(result.accountCount,2);
 assert.deepEqual(result.accounts.map(x=>x.holdings[0].averageCost),[100,200]);
 assert.equal(result.cashVerified,false);
});
test('unassigned trades remain separate and cash never inferred',()=>{
 const result=buildTestAccountHoldings([{transaction_type:'BUY',symbol:'TSLA',quantity:1,unit_price:100}]);
 assert.equal(result.unassignedTransactions,1);
 assert.equal(result.accounts[0].accountLabel,'계좌 미지정');
 assert.equal(result.accounts[0].cashBalance,null);
});
test('conflicting account identifiers are rejected',()=>{
 assert.throws(()=>buildTestAccountHoldings([{account_id:'A',portfolio_account_id:'B',transaction_type:'BUY',symbol:'TSLA',quantity:1,unit_price:100}]),/서로 다른 계좌/);
});
test('TEST page includes account-separated view and keeps write disabled',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="testAccountHoldings"/);
 assert.match(html,/buildTestAccountHoldings\(result.rows\)/);
 assert.match(html,/현금잔고·RLS 미검증/);
});
