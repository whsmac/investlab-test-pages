// INVESTLAB offline-only trade/cash RPC argument contract. No network or database writes.
// Server must independently validate all fields, balances, owner and idempotency.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const SYMBOL=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
const DEC=/^(0|[1-9][0-9]*)(?:\.([0-9]{1,8}))?$/;
const MAX=10n**26n; // numeric(26,8): 18 integer digits and 8 fractional digits
function amount(v,label){
 if(typeof v!=='string'||!DEC.test(v))throw Error('invalid '+label);
 const [i,f='']=v.split('.');const n=BigInt(i)*100000000n+BigInt(f.padEnd(8,'0'));
 if(n<=0n||n>=MAX)throw Error('invalid '+label+' range');
 return n;
}
function fmt(n){return (n/100000000n).toString()+'.'+(n%100000000n).toString().padStart(8,'0');}
function base(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('invalid request');
 for(const key of ['ownerId','userId','payloadHash','sessionUserId','serviceRoleKey'])if(key in x)throw Error('server-owned field forbidden: '+key);
 if(typeof x.accountId!=='string'||!UUID.test(x.accountId))throw Error('invalid account ID');
 if(typeof x.requestId!=='string'||!REQUEST.test(x.requestId))throw Error('invalid request ID');
 return {p_account_id:x.accountId.toLowerCase(),p_request_id:x.requestId};
}
function result(rpc,args,legs){return Object.freeze({rpc,args:Object.freeze(args),legs:Object.freeze(legs.map(x=>Object.freeze(x))),status:'OFFLINE_REVIEW_ONLY',canExecute:false,serverVerified:false,requiresAuthenticatedServerValidation:true});}
export function previewTradeRpc(x){
 const args=base(x);
 if(!['buy','sell'].includes(x.side))throw Error('invalid trade side');
 if(typeof x.ticker!=='string'||!SYMBOL.test(x.ticker)||['USD','KRW','USD-CASH'].includes(x.ticker))throw Error('invalid ticker');
 const q=amount(x.quantity,'quantity'),gross=amount(x.grossUsd,'gross USD');
 const signed=(n,negative)=> (negative?'-':'')+fmt(n);
 const legs=[{assetType:'security',assetCode:x.ticker,delta:signed(q,x.side==='sell')},{assetType:'cash',assetCode:'USD',delta:signed(gross,x.side==='buy')}];
 return result('investlab_post_trade_v2',{...args,p_side:x.side,p_ticker:x.ticker,p_quantity:fmt(q),p_gross_usd:fmt(gross)},legs);
}
export function previewCashRpc(x){
 const args=base(x);
 if(!['deposit','withdrawal','fee'].includes(x.type))throw Error('invalid cash event type');
 if(!['USD','KRW'].includes(x.currency))throw Error('invalid currency');
 const n=amount(x.amount,'cash amount');
 return result('investlab_post_cash_v1',{...args,p_event_type:x.type,p_currency:x.currency,p_amount:fmt(n)},[{assetType:'cash',assetCode:x.currency,delta:(x.type==='deposit'?'':'-')+fmt(n)}]);
}
