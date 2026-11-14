// Pure UI guidance for the offline one-click workflow.
export function describeOneClickReviewFailure({stage,detail}={}){
 const messages={
  'table':{title:'표 입력 확인 필요',action:'배정수량과 계좌별 원가·현금 입력을 수정한 후 다시 실행하세요.'},
  'ledger':{title:'원장 대조 확인 필요',action:'검토 결과의 미확인 항목을 확인하고 해당 계좌·종목을 수정하세요.'},
  'final':{title:'최종 점검 확인 필요',action:'계좌 소유 및 취득원가 확인을 완료한 뒤 다시 실행하세요.'}
 };
 const entry=messages[stage]??{title:'검토 중단',action:'입력값을 확인한 뒤 다시 실행하세요.'};
 return {...entry,detail:typeof detail==='string'?detail.slice(0,500):'',canPost:false,canMigrate:false};
}
