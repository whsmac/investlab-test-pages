import {projectLedger} from '../ledger/pilot-portfolio-projection.mjs';
const $=id=>document.getElementById(id);
const fmt=(n,dec=2)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:dec});
const krw=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:0});
const pct=n=>(n>=0?'+':'−')+Math.abs(n).toFixed(2)+'%';
const signed=n=>(n>=0?'+':'−')+fmt(Math.abs(n));
const fresh=quote=>quote&&Number.isFinite(Number(quote.close))&&Number(quote.close)>0&&quote.currency==='USD';
const cell=(tr,value,css)=>{const td=document.createElement('td');td.textContent=value;if(css)td.className=css;tr.append(td);return td;};
function pricedSummary(ledger,prices,fx){
 let value=0,pricedCost=0;const missing=[];
 for(const holding of ledger.holdings){
  const quote=prices.get(holding.symbol);
  if(fresh(quote)){value+=holding.qty*Number(quote.close);pricedCost+=holding.cost;}
  else missing.push(holding.symbol);
 }
 const complete=missing.length===0,profit=value-pricedCost,rate=pricedCost?100*profit/pricedCost:0;
 return {value,cost:pricedCost,profit,rate,missing,complete,usdCash:ledger.cash.USD||0,krwCash:ledger.cash.KRW||0,
  totalKrw:complete&&Number.isFinite(fx)?(value+ledger.cash.USD)*fx+ledger.cash.KRW:null};
}
export function renderPortfolioDashboard({data,prices,fx,fxDate,selected}){
 const all=projectLedger(data,'ALL'),allSummary=pricedSummary(all,prices,fx);
 const krwValue=(v)=>Number.isFinite(v)?'₩ '+krw(v):'—';
 const profitKrw=allSummary.complete&&Number.isFinite(fx)?allSummary.profit*fx:null;
 $('dashboardTotal').textContent=krwValue(allSummary.totalKrw);
 $('dashboardGain').textContent=profitKrw===null?'—':(profitKrw>=0?'+':'−')+'₩ '+krw(Math.abs(profitKrw));
 $('dashboardGain').className=profitKrw===null?'':profitKrw>=0?'positive':'negative';
 $('dashboardRate').textContent=allSummary.complete?pct(all.cost?100*allSummary.profit/all.cost:0):'—';
 $('dashboardRate').className=allSummary.complete?(allSummary.profit>=0?'positive':'negative'):'';
 $('dashboardStocks').textContent=allSummary.complete&&Number.isFinite(fx)?krwValue(allSummary.value*fx):'—';
 $('dashboardCash').textContent=Number.isFinite(fx)?krwValue((allSummary.usdCash*fx)+allSummary.krwCash):'—';
 $('dashboardCashBreakdown').textContent='USD '+fmt(allSummary.usdCash)+' · KRW '+krw(allSummary.krwCash);
 $('dashboardFx').textContent=Number.isFinite(fx)?'적용환율 1 USD = '+fmt(fx,2)+' KRW'+(fxDate?' · '+fxDate+' 기준':''):'원화 총자산 계산을 위해 공개 환율을 불러오는 중이거나 조회에 실패했습니다.';
 const accountBody=$('dashboardAccounts');accountBody.replaceChildren();
 for(const a of data.accounts){
  const ledger=projectLedger(data,a.id),p=pricedSummary(ledger,prices,fx),tr=document.createElement('tr');
  const name=cell(tr,a.name);name.style.fontWeight='650';
  if(a.id===selected)tr.classList.add('selected-row');
  cell(tr,krwValue(p.totalKrw));
  const gain=p.complete&&Number.isFinite(fx)?p.profit*fx:null;
  cell(tr,gain===null?'—':(gain>=0?'+':'−')+'₩ '+krw(Math.abs(gain)),gain===null?'':gain>=0?'positive':'negative');
  cell(tr,p.complete?pct(ledger.cost?100*p.profit/ledger.cost:0):'—',p.profit>=0?'positive':'negative');
  tr.style.cursor='pointer';tr.title='클릭하면 이 계좌의 종목만 표시합니다.';
  tr.onclick=()=>{$('account').value=a.id;$('account').dispatchEvent(new Event('change'));};
  accountBody.append(tr);
 }
 const totalRow=document.createElement('tr');totalRow.className='total-row';
 cell(totalRow,'전체 합계');cell(totalRow,krwValue(allSummary.totalKrw));
 cell(totalRow,profitKrw===null?'—':(profitKrw>=0?'+':'−')+'₩ '+krw(Math.abs(profitKrw)),profitKrw===null?'':profitKrw>=0?'positive':'negative');
 cell(totalRow,allSummary.complete?pct(all.cost?100*allSummary.profit/all.cost:0):'—',allSummary.profit>=0?'positive':'negative');
 accountBody.append(totalRow);
 const chosen=projectLedger(data,selected),holdingsBody=$('dashboardHoldings');holdingsBody.replaceChildren();
 for(const h of chosen.holdings){
  const tr=document.createElement('tr'),q=prices.get(h.symbol),valid=fresh(q),gain=valid?h.qty*Number(q.close)-h.cost:null,rate=valid&&h.cost>0?100*gain/h.cost:null;
  cell(tr,h.symbol,'stock-label');cell(tr,fmt(h.qty,6));cell(tr,fmt(h.averageCost,4));
  cell(tr,valid?fmt(q.close,4):'—');cell(tr,valid?fmt(h.qty*q.close):'—');
  cell(tr,gain===null?'—':signed(gain),gain===null?'':gain>=0?'positive':'negative');
  cell(tr,rate===null?'—':pct(rate),rate===null?'':gain>=0?'positive':'negative');
  holdingsBody.append(tr);
 }
 if(!chosen.holdings.length){const tr=document.createElement('tr'),td=cell(tr,'선택한 계좌에 보유종목이 없습니다.');td.colSpan=7;holdingsBody.append(tr);}
 $('dashboardNotice').textContent=allSummary.missing.length
  ?'주의: 최근 종가 미조회 '+allSummary.missing.join(', ')+' · 총자산·수익률은 불완전한 가격으로 계산하지 않습니다.'
  :!data.accounts.length?'계좌가 없습니다. 계좌·매매 기록 관리에서 먼저 등록하세요.'
  :'최근 종가 기준 평가손익입니다. 실제 체결가가 아니며 실현손익·배당·세금은 포함하지 않습니다.';
}
export async function fetchUsdKrwRate(){
 const response=await fetch('https://open.er-api.com/v6/latest/USD',{cache:'no-store'});
 if(!response.ok)throw Error('환율 조회 HTTP '+response.status);
 const result=await response.json(),rate=Number(result?.rates?.KRW);
 if(result?.result!=='success'||!Number.isFinite(rate)||rate<=0)throw Error('환율 응답 오류');
 return {rate,date:result.time_last_update_utc||''};
}
