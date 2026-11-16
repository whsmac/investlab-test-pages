import {reconcilePortfolioLedger} from '../ledger/portfolio-ledger-reconcile.mjs';
// Real portfolio/ledger reconciliation is local-only. Pilot gates cannot be inferred from it.
export function assessPortfolioLedgerPilot(input,{authenticated=false,dbSchemaVerified=false,twoUserIsolationVerified=false,serverRoundTripVerified=false}={}){
 const reconciliation=reconcilePortfolioLedger(input);
 const gates=[
  {name:'포트폴리오·원장 수량 일치',passed:reconciliation.status==='OFFLINE_QUANTITIES_MATCH_NOT_SERVER_VERIFIED',detail:reconciliation.status},
  {name:'실제 사용자 인증',passed:authenticated===true,detail:authenticated===true?'외부 확인 입력 · 이 화면에서는 재검증하지 않음':'미확인'},
  {name:'DB 테이블 구조',passed:dbSchemaVerified===true,detail:dbSchemaVerified===true?'외부 확인 입력 · 이 화면에서는 재검증하지 않음':'미확인'},
  {name:'두 사용자 데이터 격리',passed:twoUserIsolationVerified===true,detail:twoUserIsolationVerified===true?'외부 확인 입력 · 이 화면에서는 재검증하지 않음':'미확인'},
  {name:'서버 저장·재조회',passed:serverRoundTripVerified===true,detail:serverRoundTripVerified===true?'외부 확인 입력 · 이 화면에서는 재검증하지 않음':'미확인'},
  {name:'PC·모바일 5개 모듈 실제 운영 검증',passed:false,detail:'Pilot 최종 통합 검증 미실시'}
 ];
 return {reconciliation,gates,missing:gates.filter(g=>!g.passed).map(g=>g.name),pilotReady:false,canPost:false,canSync:false,mode:'OFFLINE_PILOT_GAP_REVIEW'};
}
