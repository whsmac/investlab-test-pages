import {fetchPersonalQuotes,effectivePortfolioPrices,QUOTE_MAX_TICKERS,QUOTE_REFRESH_MS} from './pilot-personal-current-quotes.mjs';
const TABLE='investlab_personal_quote_settings',KEY=/^[A-Za-z0-9_-]{10,128}$/;
async function verified(client,userId){const r=await client.auth.getUser();if(r.error||!userId||r.data?.user?.id!==userId)throw Error('로그인 계정 확인 필요')}
export async function saveSharedQuoteKey(client,userId,key){
 if(typeof key!=='string'||!KEY.test(key))throw Error('개인 API 키 형식 확인 필요');
 await verified(client,userId);
 const r=await client.from(TABLE).upsert({user_id:userId,api_key:key,quote_cache:{},next_at:'-infinity',lease:crypto.randomUUID(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(r.error)throw Error('개인 시세 설정 저장 실패');await verified(client,userId);
}
export async function removeSharedQuoteKey(client,userId){
 await verified(client,userId);const r=await client.from(TABLE).delete().eq('user_id',userId);if(r.error)throw Error('개인 시세 설정 삭제 실패');await verified(client,userId);
}
export function cachedQuotes(raw,now=Date.now()){
 const rows=raw&&typeof raw==='object'&&!Array.isArray(raw)?Object.entries(raw):[];
 return effectivePortfolioPrices(new Map(),new Map(rows.slice(0,100)),now);
}
export async function fetchSharedPersonalQuotes({client,userId,tickers,signal,fetcher=globalThis.fetch,now=Date.now}){
 await verified(client,userId);
 const list=[...new Set(tickers)].filter(t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(t)).slice(0,QUOTE_MAX_TICKERS);
 const claim=await client.rpc('claim_investlab_personal_quotes_v1');if(claim.error||!claim.data)throw Error('공통 시세 설정 조회 실패');
 await verified(client,userId);
 const d=claim.data;let cache=cachedQuotes(d.cache,now()),errors=[];
 if(!d.connected)return {connected:false,quotes:new Map(),errors};
 if(d.claimed){
  if(signal?.aborted)throw Error('조회 취소');
  const result=await fetchPersonalQuotes({tickers:list,key:d.key,signal,fetcher,now});
  if(signal?.aborted)throw Error('조회 취소');
  await verified(client,userId);errors=result.errors;
  for(const t of list)cache.delete(t);
  for(const [t,q] of result.quotes)cache.set(t,q);
  cache=cachedQuotes(Object.fromEntries(cache),now());
  const limited=errors.some(e=>['HTTP 401','HTTP 429'].includes(e.error));
  const patch={quote_cache:Object.fromEntries(cache),...(limited?{next_at:new Date(now()+5*QUOTE_REFRESH_MS).toISOString()}: {})};
  const saved=await client.from(TABLE).update(patch).eq('user_id',userId).eq('lease',d.lease).select('lease').maybeSingle();
  if(saved.error||!saved.data)throw Error('시세 설정이 변경되었습니다. 다시 조회하세요.');
 }
 await verified(client,userId);
 return {connected:true,quotes:cache,errors};
}

export function sharedQuoteUniverse(holdings=[],extra=[]){return [...new Set([...holdings,...extra,'TSLA','TQQQ','QLD','USD','BITU','SOXL','TSLL','PLTR','MSFT','GOOGL','AMZN','META','NVDA','SPCX'])].filter(t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(t)).slice(0,QUOTE_MAX_TICKERS)}
export function quoteStatusText(result,tickers,prices){
 if(!result.connected)return '개인 시세 미연결 · 최근 종가 표시 · 홈에서 최초 설정';
 const count=tickers.filter(t=>prices.get(t)?.kind==='current_quote').length;
 return '공통 Finnhub 최신 시세 '+count+'/'+tickers.length+'종목 · 미확인 종목은 종가 · 1분 갱신 · 거래소 실시간 권한 미확인'+(result.errors.some(e=>['HTTP 401','HTTP 429'].includes(e.error))?' · 인증/호출 제한으로 5분 후 재시도':'');
}
