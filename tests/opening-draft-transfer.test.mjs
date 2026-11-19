import test from 'node:test';import assert from 'node:assert/strict';
import {serializeOpeningDraft,parseOpeningDraft} from '../src/ledger/opening-draft-transfer.mjs';
import {compareOpeningSnapshots} from '../src/ledger/opening-snapshot-compare.mjs';
const a='123e4567-e89b-12d3-a456-426614174000';
const data={positions:[{accountId:a,ticker:'USD',quantity:'107',averageCostUsd:'83.6'}],cash:[{accountId:a,currency:'USD',balance:'1000'},{accountId:a,currency:'KRW',balance:'50000'}]};
test('guided draft file round-trips account stock and both cash currencies',()=>{const b=parseOpeningDraft(serializeOpeningDraft(data));assert.equal(compareOpeningSnapshots(data,b).status,'ALL_MATCH')});
test('rejects unsupported and invalid drafts',()=>{for(const s of ['{}','not-json',JSON.stringify({...data,format:'WRONG',version:1}),JSON.stringify({format:'INVESTLAB_OPENING_DRAFT_V1',version:1,positions:[],cash:[{accountId:a,currency:'JPY',balance:'2'}]})])assert.throws(()=>parseOpeningDraft(s))});
test('rejects invalid account mapping before file creation',()=>assert.throws(()=>serializeOpeningDraft({positions:[{...data.positions[0],accountId:'bad'}],cash:[]})));
