import {buildOpeningSnapshot} from './opening-snapshot-preview.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT=/^(0|[1-9]\d*)(?:\.(\d{1,8}))?$/;
export function assessOpeningAccountPlan({accounts=[],positions=[],cash=[]}={}){
 if(!Array.isArray(accounts)||!accounts.length)throw Error('at least one explicitly named account required');
 if(accounts.length>100)throw Error('too many accounts');
 const byId=new Map(),warnings=[];
 for(const a of accounts){
  if(!a||typeof a.id!=='string'||!UUID.test(a.id)||typeof a.name!=='string'||!a.name.trim()||a.name.trim().length>100)throw Error('invalid account ID or name');
  const id=a.id.toLowerCase();if(byId.has(id))throw Error('duplicate account ID');
  if(typeof a.ownerConfirmed!=='boolean')throw Error('account owner confirmation required');
  byId.set(id,{id,name:a.name.trim(),ownerConfirmed:a.ownerConfirmed});
 }
 const snapshot=buildOpeningSnapshot({positions,cash});
 const counts=new Map([...byId.keys()].map(id=>[id,{positions:0,cash:0}]));
 for(const row of snapshot.rows){
  const countsFor=counts.get(row.accountId);if(!countsFor)throw Error('opening row refers to unregistered account');
  if(row.kind==='opening_position')countsFor.positions++;else countsFor.cash++;
 }
 const summary=[...byId.values()].map(a=>({...a,...counts.get(a.id)}));
 for(const a of summary){
  if(!a.ownerConfirmed)warnings.push(a.name+': ownership not confirmed');
  if(!a.positions&&!a.cash)warnings.push(a.name+': no opening rows');
 }
 for(const p of positions)if(!AMOUNT.test(p.averageCostUsd)||p.averageCostUsd==='0'||/^0\.0+$/.test(p.averageCostUsd))warnings.push(p.ticker+': zero historical cost requires manual review');
 if(!positions.length&&!cash.length)warnings.push('no opening data');
 return {format:'INVESTLAB_TEST_OPENING_ACCOUNT_PLAN_V1',status:warnings.length?'REVIEW_REQUIRED':'OFFLINE_PLAN_VALIDATED_NOT_SERVER_VERIFIED',accounts:summary,openingRows:snapshot.rows,warnings,
  missingFeatures:['authenticated account onboarding','opening balance posting RPC','cash deposit/withdrawal RPC','rollback and A/B isolation tests'],
  canExecuteSql:false,canUpload:false,canMigrate:false,serverVerified:false,authorization:'NONE'};
}
