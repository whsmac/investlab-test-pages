// Pure offline oracle for a proposed owner-only RLS policy.
// This is NOT a substitute for live Supabase JWT/PostgREST verification.
export function expectedScenarioRlsAccess({actorId,ownerId,action,newOwnerId}){
 if(!['select','insert','update','delete'].includes(action))throw Error('지원하지 않는 작업');
 if(typeof ownerId!=='string'||!ownerId.trim())throw Error('소유자 누락');
 if(typeof actorId!=='string'||!actorId.trim())return false;
 if(action==='insert')return actorId===ownerId;
 if(action==='update')return actorId===ownerId&&(newOwnerId===undefined||newOwnerId===actorId);
 return actorId===ownerId;
}
