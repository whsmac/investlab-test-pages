// Offline TEST validation only. No Supabase client, localStorage or network writes.
const isRecord=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const allowedAssumptions=new Set(['targetCash','terminalPrices']);
const allowedStep=new Set(['type','ticker','quantity','price','fee']);
const tickerPattern=/^[A-Z0-9.^_-]{1,20}$/;
const finiteNonnegative=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function validateOnlineScenarioDraft(input){
 if(!isRecord(input))throw Error('전략 문서 형식 오류');
 const allowedTop=new Set(['name','steps','assumptions','sourceLedgerRevision']);
 for(const key of Object.keys(input))if(!allowedTop.has(key))throw Error('저장 불가 필드: '+key);
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80)throw Error('전략명 오류');
 if(!Array.isArray(input.steps)||input.steps.length>100)throw Error('가상 거래 단계 수 오류');
 if(!isRecord(input.assumptions))throw Error('가정값 형식 오류');
 for(const key of Object.keys(input.assumptions))if(!allowedAssumptions.has(key))throw Error('허용되지 않는 가정값: '+key);
 const assumptions=input.assumptions;
 if(assumptions.targetCash!==undefined&&!finiteNonnegative(assumptions.targetCash))throw Error('목표 현금 오류');
 if(assumptions.terminalPrices!==undefined){
  if(!isRecord(assumptions.terminalPrices)||Object.keys(assumptions.terminalPrices).length>300)throw Error('목표주가 형식 오류');
  for(const [ticker,price] of Object.entries(assumptions.terminalPrices))
   if(!tickerPattern.test(ticker)||!finiteNonnegative(price))throw Error('목표주가 오류: '+ticker);
 }
 const steps=input.steps.map((step,index)=>{
  if(!isRecord(step))throw Error((index+1)+'번 거래 형식 오류');
  for(const key of Object.keys(step))if(!allowedStep.has(key))throw Error((index+1)+'번 거래 불허 필드: '+key);
  if(!['BUY','SELL'].includes(step.type)||typeof step.ticker!=='string'||!tickerPattern.test(step.ticker)||
   typeof step.quantity!=='number'||!Number.isFinite(step.quantity)||step.quantity<=0||
   typeof step.price!=='number'||!Number.isFinite(step.price)||step.price<=0||
   (step.fee!==undefined&&!finiteNonnegative(step.fee)))throw Error((index+1)+'번 거래 값 오류');
  return {type:step.type,ticker:step.ticker,quantity:step.quantity,price:step.price,fee:step.fee??0};
 });
 if(input.sourceLedgerRevision!==undefined&&(typeof input.sourceLedgerRevision!=='string'||input.sourceLedgerRevision.length>128))throw Error('원장 참조 형식 오류');
 const result={name:input.name.trim(),steps,assumptions:{
  ...(assumptions.targetCash!==undefined?{targetCash:assumptions.targetCash}:{}),
  ...(assumptions.terminalPrices!==undefined?{terminalPrices:Object.fromEntries(Object.entries(assumptions.terminalPrices))}:{})
 },...(input.sourceLedgerRevision!==undefined?{sourceLedgerRevision:input.sourceLedgerRevision}:{})};
 if(new TextEncoder().encode(JSON.stringify(result)).length>65536)throw Error('전략 문서 용량 초과');
 return {payload:result,valid:true,remoteWrite:false};
}
