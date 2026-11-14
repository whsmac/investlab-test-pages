import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPortfolioMigration} from '../src/ledger/portfolio-migration-assessment.mjs';
test('recognizes old holding shape without marking ready',()=>{
 const v=assessPortfolioMigration({holdings:[{symbol:'TSLA',shares:10,avg_cost:250}]});
 assert.equal(v.recognizedCount,1);
 assert.equal(v.rows[0].quantity,'10');
 assert.equal(v.rows[0].readyToImport,false);
});
test('rejects missing cost and ambiguous cash',()=>{
 const v=assessPortfolioMigration({holdings:[{symbol:'TSLA',shares:10},{symbol:'USD-CASH',shares:1000}]});
 assert.equal(v.recognizedCount,0);
 assert.equal(v.warnings.length,2);
});
test('flags duplicate tickers, does not aggregate across accounts',()=>{
 const v=assessPortfolioMigration({holdings:[{symbol:'TSLA',shares:'1',avg_cost:'100'},{symbol:'TSLA',shares:'2',avg_cost:'200'}]});
 assert.equal(v.recognizedCount,1);
 assert.match(v.warnings[0],/duplicate/);
});
test('no input mutation',()=>{
 const original={holdings:[{symbol:'TSLA',shares:'1',avg_cost:'100'}]};
 const before=JSON.stringify(original);
 assessPortfolioMigration(original);
 assert.equal(JSON.stringify(original),before);
});
