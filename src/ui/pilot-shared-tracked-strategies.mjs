import {loadTrackerDocument} from '../strategy/strategy-tracker-storage.mjs';
import {replayDocument} from '../strategy/strategy-tracker-document.mjs';
import {validateAllocation} from '../strategy/investment-strategy-tracker.mjs';
import {partialConversion} from '../strategy/strategy-tracker-partial-conversion.mjs';
import {projectLedger} from '../ledger/pilot-portfolio-projection.mjs';
import {validateLedger} from '../ledger/pilot-ledger-validation.mjs';
import {tradeSettlement} from '../ledger/pilot-brokerage-settlement.mjs';
// Both modules read the same authenticated tracker document. No scenario,
// ledger, tracker, or browser-draft writes are made by this read-only panel.
export async function readSharedStrategies(connection){
 const {client,userId}=connection;
 const [doc,remote]=await Promise.all([loadTrackerDocument(client,userId),client.from('investlab_pilot_ledger_documents').select('payload').eq('user_id',userId).maybeSingle()]);
 if(remote.error||!remote.data?.payload)throw Error('본인 서버 거래 기록 미확인');
 const ledger=remote.data.payload;validateLedger(ledger);
 const accounts=new Map(ledger.accounts.map(a=>[a.id,projectLedger(ledger,a.id)]));
 const strategies=replayDocument(doc.payload,ledger,tradeSettlement,validateAllocation,accounts);
 const check=await client.auth.getUser();if(check.error||check.data?.user?.id!==userId)throw Error('로그인 계정 변경');
 return strategies.filter(s=>s.status==='active').map(s=>({...s,accountName:ledger.accounts.find(a=>a.id===s.accountId)?.name||'계좌 미확인'}));
}
export function trackedFollowup(s,priceInputs,sellPct,buyPct,costUsd,useExistingUsd){
 if(s?.status!=='active'||s.target.kind!=='stock')throw Error('운용 중인 주식 목표 전략만 지원합니다.');
 return partialConversion(s,new Map(Object.entries(priceInputs).map(([t,price])=>[t,{price:Number(price)}])),{sellPct,buyPct,costUsd,useExistingUsd});
}
export function wireSharedTrackedStrategies({getConnection,getQuotes}){
 const $=id=>document.getElementById('sharedTracked'+id);
 let list=[],owner=null,serial=0,selected=null,priceFields=new Map(),sellFields=new Map(),requestId=new URLSearchParams(location.hash.slice(1)).get('tracked');
 const f=(v,d=0)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
 const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
 function clear(){++serial;list=[];owner=null;selected=null;priceFields.clear();sellFields.clear();$('Select').replaceChildren();$('Select').disabled=true;$('Body').hidden=true;$('Open').hidden=true;$('Result').textContent='';$('Status').textContent='로그인 후 운용전략 자동 조회';}
 function updateDefaults(){if(!selected)return;const q=getQuotes();for(const [ticker,input] of priceFields){if(input.dataset.manual==='1')continue;const v=q.get(ticker),valid=v?.close>0&&(!selected.actualOrigin||v.date>=selected.actualOrigin.date);input.value=valid?String(v.close):'';input.title=valid?'가용 시세 '+v.date:'가격 직접 입력 필요';}calculate();}
 function calculate(){const out=$('Result');out.textContent='';if(!selected||selected.target.kind!=='stock')return;
 try{const prices=Object.fromEntries([...priceFields].map(([k,v])=>[k,v.value])),sell=Object.fromEntries([...sellFields].map(([k,v])=>[k,Number(v.value)]));
 const r=trackedFollowup(selected,prices,sell,Number($('BuyPct').value),Number($('Cost').value),$('UseCash').checked);
 out.textContent='예상 매도대금 USD '+f(r.gross)+' · '+r.target+' 추가 매수 '+f(r.bought)+'주 · 전환 후 '+r.target+' '+f(r.totalTarget)+'주 · 잔여 USD '+f(r.remainingUsd)+' · 남은 기타 종목 평가액 USD '+f(r.remainingStockValue)+(r.existingKrw?' · KRW 현금 '+f(r.existingKrw)+' 별도 유지':'');
 }catch(e){out.textContent=e.message+' · 가정 주가를 확인하세요.'}}
 function select(){
 selected=list.find(s=>s.id===$('Select').value)||null;priceFields.clear();sellFields.clear();$('Rows').replaceChildren();$('Result').textContent='';$('Body').hidden=!selected;$('Open').hidden=!selected;if(!selected)return;
 $('Open').href='./investment-strategy-tracker.html#strategy='+encodeURIComponent(selected.id);
 $('Info').textContent=selected.accountName+' · 시작 '+selected.startedAt.slice(0,10)+' · 최초 '+selected.target.symbol+' '+f(selected.baseline.quantity)+' · 현재 전략 배정자산만 사용';
 $('Controls').hidden=selected.target.kind!=='stock';$('BuyPct').value='100';$('Cost').value='0';$('UseCash').checked=false;
 for(const a of selected.assets){const tr=el('tr');for(const v of [a.symbol+(a.kind==='cash'?' 현금':''),f(a.quantity)])tr.append(el('td',v));
 const td=el('td'),sale=el('td');if(a.kind==='stock'){
 const input=el('input');input.type='number';input.min='0.01';input.step='any';input.setAttribute('aria-label',a.symbol+' 가정 주가 USD');input.oninput=()=>{input.dataset.manual='1';calculate()};priceFields.set(a.symbol,input);td.append(input);
 if(a.symbol!==selected.target.symbol){const x=el('input');x.type='number';x.min='0';x.max='100';x.step='1';x.value='0';x.setAttribute('aria-label',a.symbol+' 매도 비율');x.oninput=calculate;sellFields.set(a.symbol,x);sale.append(x)}else sale.textContent='목표 종목';
 }else{td.textContent='—';sale.textContent='—'}tr.append(td,sale);$('Rows').append(tr)}
 if(selected.target.kind==='stock'&&!priceFields.has(selected.target.symbol)){const tr=el('tr');tr.append(el('td',selected.target.symbol+' (재매수 목표)'),el('td','0'));const td=el('td'),input=el('input');input.type='number';input.min='0.01';input.step='any';input.setAttribute('aria-label',selected.target.symbol+' 재매수 가정가 USD');input.oninput=()=>{input.dataset.manual='1';calculate()};priceFields.set(selected.target.symbol,input);td.append(input);tr.append(td,el('td','—'));$('Rows').append(tr)}
 updateDefaults();
 }
 async function refresh(){const n=++serial;const previous=selected?.id;$('Status').textContent='서버 운용전략 조회 중…';try{const c=await getConnection();if(n!==serial)return;if(owner&&owner!==c.userId){clear();return}const next=await readSharedStrategies(c);if(n!==serial)return;const check=await getConnection();if(n!==serial||check.userId!==c.userId){if(n===serial)clear();return}owner=c.userId;const old=selected;list=next;$('Select').replaceChildren();for(const s of list){const o=el('option',s.name);o.value=s.id;$('Select').append(o)}$('Select').disabled=!list.length;const want=requestId||previous;if(list.some(s=>s.id===want))$('Select').value=want;requestId=null;$('Status').textContent=list.length?'실시간 투자전략 추적과 동일한 서버 운용전략 '+list.length+'개 · 실제 주문 및 저장 변경 없음':'운용 중인 실제 전략 없음';const fresh=list.find(s=>s.id===$('Select').value);if(old&&fresh&&old.id===fresh.id&&JSON.stringify(old.assets)===JSON.stringify(fresh.assets)&&JSON.stringify(old.target)===JSON.stringify(fresh.target)){selected=fresh;updateDefaults()}else select();}catch(e){if(n===serial){clear();$('Status').textContent='운용전략 조회 실패: '+e.message}}}
 $('Select').onchange=select;$('Refresh').onclick=refresh;$('All').onclick=()=>{for(const x of sellFields.values())x.value='100';calculate()};$('Reset').onclick=()=>{for(const x of sellFields.values())x.value='0';for(const x of priceFields.values())delete x.dataset.manual;updateDefaults()};for(const id of ['BuyPct','Cost','UseCash'])$(id).oninput=calculate;
 window.addEventListener('storage',e=>{if(['investlab_shared_data_auth_v1','investlab_shared_data_connection_v1'].includes(e.key))clear()});
 window.addEventListener('pagehide',clear);clear();return {refresh,clear,updateDefaults};
}
