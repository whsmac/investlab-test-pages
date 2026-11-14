// User-facing offline input guidance; never grants posting or migration permission.
const LABELS={export:'보유종목 원본',accounts:'계좌 목록',allocations:'계좌별 종목 배정',cash:'현금잔고',cost:'취득원가 확인'};
export function describeOpeningInputError(error,{field}={}){
 const raw=String(error?.message??error??'알 수 없는 오류');
 const prefix=field&&LABELS[field]?LABELS[field]+' · ':'';
 if(error instanceof SyntaxError||/Unexpected token|Unexpected end of JSON input|not valid JSON/i.test(raw))return {message:prefix+'JSON 형식이 올바르지 않습니다.',action:'괄호, 쉼표, 큰따옴표를 확인하세요. 표 입력을 사용하면 직접 JSON을 수정하지 않아도 됩니다.',field:field??null};
 if(/duplicate|중복/i.test(raw))return {message:prefix+'중복된 입력이 있습니다.',action:'같은 계좌·종목 또는 계좌·통화가 두 번 입력되지 않았는지 확인하세요.',field:field??null};
 if(/UUID|accountId|unknown account|계좌.*(없|오류)/i.test(raw))return {message:prefix+'계좌 연결 정보를 확인해야 합니다.',action:'계좌를 먼저 등록하고 종목·현금 행에서 올바른 계좌를 선택하세요.',field:field??null};
 if(/ownerConfirmed|ownerVerified|ownership|소유 확인/i.test(raw))return {message:prefix+'계좌 또는 취득원가 확인이 필요합니다.',action:'실제 계좌 소유 여부와 취득원가를 확인한 뒤 체크하세요.',field:field??null};
 if(/quantity|shares|balance|decimal|precision|numeric|수량|잔고/i.test(raw))return {message:prefix+'수량 또는 잔고 입력을 확인하세요.',action:'숫자를 입력하고 음수·문자·소수점 8자리 초과 여부를 확인하세요.',field:field??null};
 if(/cost|원가/i.test(raw))return {message:prefix+'취득원가 입력을 확인하세요.',action:'계좌별 실제 평균취득단가(USD)를 확인해 입력하세요.',field:field??null};
 if(/1MiB|size|크기/i.test(raw))return {message:prefix+'파일 또는 입력 크기가 제한을 초과했습니다.',action:'1MiB 이하의 JSON 파일을 사용하세요.',field:field??null};
 return {message:prefix+'검증을 완료하지 못했습니다.',action:'입력 항목을 확인하세요. 상세 오류: '+raw.slice(0,200),field:field??null};
}
