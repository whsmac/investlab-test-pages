// INVESTLAB TEST: read-only portfolio allocation by current market value.
// The same authenticated ledger and daily closing prices already used in
// My Portfolio supply every number. Nothing is saved or transmitted.
import {projectLedger} from '../ledger/pilot-portfolio-projection.mjs';

export const ALLOCATION_COLORS=Object.freeze([
 '#7ca7ff','#42d3a5','#ffb86b','#c59cff','#fb7185',
 '#5eead4','#facc15','#93c5fd','#fdba74','#a3e635'
]);
const validQuote=q=>q&&q.currency==='USD'&&Number.isFinite(Number(q.close))&&Number(q.close)>0;
const safeCash=value=>Number.isFinite(Number(value))?Number(value):NaN;
const amountFormat=(value,mode)=>mode==='KRW'
 ?'KRW '+Math.round(value).toLocaleString('ko-KR')
 :'USD '+value.toLocaleString('en-US',{maximumFractionDigits:2});

export function buildPortfolioAllocation({data,prices,fx,selected='ALL',displayCurrency='KRW'}){
 const mode=displayCurrency==='USD'?'USD':'KRW';
 const holdings=projectLedger(data,selected);
 const usdCash=safeCash(holdings.cash.USD??0);
 const krwCash=safeCash(holdings.cash.KRW??0);
 const haveFx=Number.isFinite(fx)&&fx>0;
 const missing=[];
 const positions=[];
 let hasDollarExposure=usdCash>0;
 for(const holding of holdings.holdings){
  const qty=Number(holding.qty);
  if(!Number.isFinite(qty)||qty<0)return {complete:false,mode,selected,rows:[],total:null,
   notice:'보유수량이 올바르지 않아 자산 비중을 표시하지 않습니다'};
  if(qty===0)continue;
  const quote=prices.get(holding.symbol);
  if(!validQuote(quote)){missing.push(holding.symbol);continue;}
  const usd=qty*Number(quote.close);
  if(!Number.isFinite(usd)||usd<0)return {complete:false,mode,selected,rows:[],total:null,
   notice:'시세 계산 오류 · 자산 비중을 표시하지 않습니다'};
  positions.push({ticker:holding.symbol,usd});
  hasDollarExposure=true;
 }
 if(missing.length)return {complete:false,mode,selected,rows:[],total:null,
  notice:'종가 미조회: '+missing.join(', ')+' · 누락 종목을 제외한 비중은 잘못된 결과가 되므로 표시하지 않습니다'};
 if(!Number.isFinite(usdCash)||!Number.isFinite(krwCash)||usdCash<0||krwCash<0)
  return {complete:false,mode,selected,rows:[],total:null,
   notice:'음수 또는 잘못된 현금잔고가 있어 자산 구성비를 표시하지 않습니다'};
 if(!haveFx&&(krwCash>0&&mode==='USD'||hasDollarExposure&&mode==='KRW'))
  return {complete:false,mode,selected,rows:[],total:null,
   notice:'원화/달러 자산 비중 계산에 적용환율이 필요합니다 · 환율을 확인 중입니다'};
 const rate=mode==='KRW'?fx:1;
 const rows=positions.map(p=>({
  ticker:p.ticker,label:p.ticker,kind:'security',amount:p.usd*(mode==='KRW'?rate:1)
 }));
 const cashAmount=mode==='KRW'?usdCash*(haveFx?fx:1)+krwCash
  :usdCash+(haveFx?krwCash/fx:0);
 if(!Number.isFinite(cashAmount)||cashAmount<0)
  return {complete:false,mode,selected,rows:[],total:null,
   notice:'현금잔고 환산이 불가능하여 자산 구성비를 표시하지 않습니다'};
 // Use ONE cash slice with transparent original-currency breakdown.
 if(cashAmount>0)rows.push({
  ticker:null,label:'현금',kind:'cash',amount:cashAmount,
  description:'USD '+usdCash.toLocaleString('en-US',{maximumFractionDigits:2})+
   ' · KRW '+Math.round(krwCash).toLocaleString('ko-KR')
 });
 rows.sort((a,b)=>b.amount-a.amount||a.label.localeCompare(b.label));
 const total=rows.reduce((sum,row)=>sum+row.amount,0);
 if(!Number.isFinite(total)||total<=0)
  return {complete:true,mode,selected,rows:[],total:0,
   notice:'평가금액과 현금잔고가 없어 표시할 자산 배분이 없습니다'};
 return {complete:true,mode,selected,total,rows:rows.map((row,i)=>({
  ...row,percentage:row.amount/total*100,color:ALLOCATION_COLORS[i%ALLOCATION_COLORS.length]
 })),notice:holdings.holdings.some(h=>prices.get(h.symbol)?.kind==='current_quote')?'현재 시세 및 대체 종가와 현금잔고 기준 · 실제 체결가 아님':'최근 종가와 현금잔고 기준 · 실제 체결가 아님'};
}

function element(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
function svgElement(name,attributes={},text){
 const node=document.createElementNS('http://www.w3.org/2000/svg',name);
 for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
 if(text!==undefined)node.textContent=text;
 return node;
}
export function renderPortfolioAllocation(model,{chart,legend,status,title}){
 chart.replaceChildren();
 legend.replaceChildren();
 status.textContent=model.notice;
 title.textContent=model.selected==='ALL'?'전체 계좌':'선택 계좌';
 if(!model.complete||!model.rows.length){
  const placeholder=element('p','allocation-placeholder',!model.complete?'평가자료 확인 필요':'배분할 자산이 없습니다');
  chart.append(placeholder);
  return;
 }
 const svg=svgElement('svg',{
  viewBox:'0 0 240 240',role:'img','aria-label':'자산 배분 도넛 차트: '+
  model.rows.map(row=>row.label+' '+row.percentage.toFixed(2)+'퍼센트').join(', ')
 });
 const radius=72,circumference=2*Math.PI*radius;
 svg.append(svgElement('circle',{cx:120,cy:120,r:radius,fill:'none',
  stroke:'#263854','stroke-width':28}));
 let offset=0;
 for(const row of model.rows){
  if(row.amount<=0)continue;
  const length=row.percentage/100*circumference;
  svg.append(svgElement('circle',{cx:120,cy:120,r:radius,fill:'none',
   stroke:row.color,'stroke-width':28,'stroke-dasharray':length+' '+(circumference-length),
   'stroke-dashoffset':-offset,transform:'rotate(-90 120 120)'}));
  offset+=length;
 }
 svg.append(svgElement('text',{x:120,y:109,'text-anchor':'middle',
  fill:'#bdcce5','font-size':12},'총 자산'));
 const center=amountFormat(model.total,model.mode);
 svg.append(svgElement('text',{x:120,y:132,'text-anchor':'middle',
  fill:'#edf2ff','font-size':center.length>17?13:16,'font-weight':'700'},center));
 chart.append(svg);
 for(const row of model.rows){
  const item=element('li','allocation-item');
  const swatch=element('span','allocation-swatch');
  swatch.style.background=row.color;
  swatch.setAttribute('aria-hidden','true');
  const name=element('span','allocation-name',row.label);
  if(row.kind==='cash'){
   const breakdown=element('small','allocation-breakdown',row.description);
   name.append(breakdown);
  }
  const amount=element('span','allocation-amount',amountFormat(row.amount,model.mode));
  const share=element('strong','allocation-percent',row.percentage.toFixed(1)+'%');
  item.append(swatch,name,amount,share);
  legend.append(item);
 }
}
