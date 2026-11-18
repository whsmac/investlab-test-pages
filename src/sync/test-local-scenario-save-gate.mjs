// TEST-only pre-save compatibility gate for existing local simulator strategies.
// Preserve the current local storage format; inspect before any storage mutation.
import {previewLegacySimulatorStrategies} from './test-legacy-simulator-preview.mjs';
export function reviewLocalScenarioSave(strategies){
 if(!Array.isArray(strategies)||!strategies.length)throw Error('저장할 전략이 없습니다');
 const report=previewLegacySimulatorStrategies({strategies});
 const invalid=report.reports.filter(x=>x.status!=='preview_only');
 if(invalid.length)throw Error('전략 저장 전 변환 점검 실패: '+invalid.map(x=>x.index+'번 '+x.reason).join(' / '));
 return {valid:true,scenarioCount:report.reports.length,virtualTradeCount:report.reports.reduce((sum,x)=>sum+x.tradeCount,0),
  legacyStorageUnchanged:true,remoteStorageEnabled:false,duplicateLedgerSnapshotSaved:false,
  note:'기존 브라우저 전략 형식으로만 저장합니다. 실제 보유종목·현금잔고는 전략 저장 데이터에 추가하지 않습니다.'};
}
