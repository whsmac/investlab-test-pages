// Pure TEST-only optimistic concurrency rules. No network, storage or database writes.
export function checkScenarioRevision({expectedRevision,currentRevision}){
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('요청 버전 오류');
 if(!Number.isSafeInteger(currentRevision)||currentRevision<1)throw Error('저장 버전 오류');
 if(expectedRevision!==currentRevision)return {allowed:false,status:'conflict',expectedRevision,currentRevision};
 return {allowed:true,status:'matched',nextRevision:currentRevision+1};
}
export function checkScenarioQuota({existingCount,maxCount=30,creating}){
 if(!Number.isSafeInteger(existingCount)||existingCount<0||!Number.isSafeInteger(maxCount)||maxCount<1||typeof creating!=='boolean')throw Error('저장 건수 입력 오류');
 return {allowed:!creating||existingCount<maxCount,existingCount,maxCount};
}
