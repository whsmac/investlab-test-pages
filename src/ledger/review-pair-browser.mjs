export function validateReviewPairFiles({openingFile,evidenceFile,maxBytes=1048576}={}){
 const files=[openingFile,evidenceFile];
 if(files.some(f=>!f))throw Error('초기잔고·종합 시험 증빙 파일을 모두 선택하세요');
 if(files.some(f=>!Number.isSafeInteger(f.size)||f.size<=0||f.size>maxBytes))throw Error('각 파일은 1MiB 이하의 비어 있지 않은 JSON이어야 합니다');
 if(files.some(f=>typeof f.arrayBuffer!=='function'))throw Error('브라우저 파일 입력만 허용합니다');
 return {files,serverVerified:false,canMigrate:false,canPost:false};
}
export function describeReviewPairResult({matched,reviewerConfirmed}={}){
 if(matched!==true)return '파일 지문 불일치 · 선택한 파일을 다시 확인하세요';
 return reviewerConfirmed===true?'SHA-256 파일 지문 일치 · 사용자 확인 기록 · 서버 검증 아님':'SHA-256 파일 지문 일치 · 사용자 확인 미완료 · 서버 검증 아님';
}
