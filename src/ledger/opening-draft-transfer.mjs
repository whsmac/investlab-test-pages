import {buildOpeningSnapshot} from './opening-snapshot-preview.mjs';
export const MAX_SNAPSHOT_BYTES=1024*1024;
export function serializeOpeningDraft(input){
 const result=buildOpeningSnapshot(input);
 return JSON.stringify({format:'INVESTLAB_OPENING_DRAFT_V1',version:1,positions:result.rows.filter(r=>r.kind==='opening_position').map(({accountId,ticker,quantity,averageCostUsd})=>({accountId,ticker,quantity,averageCostUsd})),cash:result.rows.filter(r=>r.kind==='opening_cash').map(({accountId,currency,balance})=>({accountId,currency,balance}))},null,2);
}
export function parseOpeningDraft(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SNAPSHOT_BYTES)throw Error('invalid or oversized JSON');
 let data;try{data=JSON.parse(text)}catch{throw Error('invalid JSON')}
 if(!data||data.format!=='INVESTLAB_OPENING_DRAFT_V1'||data.version!==1)throw Error('unsupported draft format/version');
 if(!Array.isArray(data.positions)||!Array.isArray(data.cash))throw Error('missing positions/cash arrays');
 if(data.positions.length+data.cash.length>10000)throw Error('too many rows');
 buildOpeningSnapshot(data);
 return {positions:data.positions,cash:data.cash};
}
