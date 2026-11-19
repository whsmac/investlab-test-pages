// Read-only preview of converting existing simulator strategies to minimal
// scenario documents. Never mutate legacy drafts or persisted strategy records.
import {prepareTestScenarioDocument} from './test-scenario-storage-normalization.mjs';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function previewLegacySimulatorStrategies(legacy){
 if(!plain(legacy)||!Array.isArray(legacy.strategies))throw Error('기존 전략 데이터 형식 오류');
 if(legacy.strategies.length>30)throw Error('전략 수 제한 초과');
 const reports=legacy.strategies.map((strategy,i)=>{
  if(!plain(strategy))return {index:i+1,status:'review_required',reason:'전략 형식 오류'};
  const trades=Array.isArray(strategy.trades)?strategy.trades:[];
  try{
   if(!Array.isArray(strategy.trades))throw Error('거래 단계 누락');
   const steps=trades.map((trade,j)=>{
    if(!plain(trade))throw Error((j+1)+'번 거래 형식 오류');
    const side=String(trade.side||'').toUpperCase();
    if(!['BUY','SELL'].includes(side))throw Error((j+1)+'번 매매 유형 오류');
    return {type:side,ticker:trade.ticker,quantity:trade.quantity,price:trade.price,fee:trade.fee};
   });
   const candidate={name:strategy.name,steps,assumptions:{targetCash:strategy.targetCash??0,terminalPrices:strategy.terminalPrices??{}}};
   const result=prepareTestScenarioDocument(candidate);
   return {index:i+1,name:strategy.name,status:'preview_only',tradeCount:steps.length,
    hypotheticalSteps:result.payload.steps,assumptions:result.payload.assumptions,
    legacySnapshotExcluded:true,canWrite:false};
  }catch(error){return {index:i+1,name:String(strategy.name||''),status:'review_required',reason:error.message};}
 });
 return {reports,previewOnly:true,canOverwrite:false,canDelete:false,canPost:false,
  legacySnapshotFields:['positions','cash','prices','priorTax','deduction','taxRate'],
  note:'기존 임시저장·전략 데이터는 변경하지 않습니다. 가상 거래 단계만 새 저장 형식으로 변환 가능성을 점검합니다.'};
}
