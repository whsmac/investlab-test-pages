import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalOpeningPayload,openingPayloadSha256} from '../src/ledger/opening-payload-hash.mjs';
const accountId='33333333-3333-4333-8333-333333333333';
const base={accountId,requestId:'open-1',rows:[{assetType:'security',assetCode:'TSLA',delta:'2',openingCostBasisUsd:'100'},{assetType:'cash',assetCode:'USD',delta:'500'}]};
test('row order and decimal formatting cannot change canonical payload hash',async()=>{
 const a=await openingPayloadSha256(base);
 const b=await openingPayloadSha256({...base,rows:[{assetType:'cash',assetCode:'USD',delta:'500.000'},{assetType:'security',assetCode:'TSLA',delta:'2.00000000',openingCostBasisUsd:'100.0'}]});
 assert.match(a,/^[a-f0-9]{64}$/);assert.equal(a,b);
});
test('changing account, request ID, quantity or cost changes hash',async()=>{
 const h=await openingPayloadSha256(base);
 for(const candidate of [{...base,requestId:'open-2'},{...base,accountId:'44444444-4444-4444-8444-444444444444'},{...base,rows:[{...base.rows[0],delta:'3'},base.rows[1]]},{...base,rows:[{...base.rows[0],openingCostBasisUsd:'101'},base.rows[1]]}])assert.notEqual(await openingPayloadSha256(candidate),h);
});
test('rejects duplicate assets, unexpected fields, invalid amounts and negative balances',()=>{
 for(const rows of [[base.rows[0],base.rows[0]],[{...base.rows[1],delta:'-1'}],[{...base.rows[1],unexpected:'x'}],[{...base.rows[1],openingCostBasisUsd:'1'}],[{...base.rows[0],openingCostBasisUsd:undefined}]])assert.throws(()=>canonicalOpeningPayload({...base,rows}));
});
