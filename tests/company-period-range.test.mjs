import test from 'node:test';
import assert from 'node:assert/strict';
import {companyPeriodStart} from '../src/market/company-period-range.mjs';

test('company chart 3-, 5-year lookback keeps KST calendar date',()=>{
 const now=new Date('2026-11-20T11:32:00Z'); // 2026-11-20 20:32 KST
 assert.equal(companyPeriodStart('3m',now),'2026-08-20');
 assert.equal(companyPeriodStart('6m',now),'2026-05-20');
 assert.equal(companyPeriodStart('1y',now),'2025-11-20');
 assert.equal(companyPeriodStart('3y',now),'2023-11-20');
 assert.equal(companyPeriodStart('5y',now),'2021-11-20');
});

test('month-end lookbacks clamp February to the final actual date',()=>{
 assert.equal(companyPeriodStart('3m','2026-05-31T12:00:00Z'),'2026-02-28');
 assert.equal(companyPeriodStart('3m','2024-05-31T12:00:00Z'),'2024-02-29');
 assert.equal(companyPeriodStart('1y','2024-02-29T12:00:00Z'),'2023-02-28');
});

test('KST day boundary is consistent when UTC is still the previous date',()=>{
 assert.equal(companyPeriodStart('3m','2026-11-19T16:00:00Z'),'2026-08-20');
 assert.equal(companyPeriodStart('5y','2026-11-19T16:00:00Z'),'2021-11-20');
});

test('invalid ranges and timestamps fail closed',()=>{
 assert.throws(()=>companyPeriodStart('2y'),/조회 기간/);
 assert.throws(()=>companyPeriodStart('3y','bad datetime'),/기준일/);
});
