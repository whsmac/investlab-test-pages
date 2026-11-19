// Retrieve latest public TEST Yahoo review artifact through GitHub Actions.
// Public repository only. Never accepts tokens, private repository URLs, or DB credentials.
const OWNER="whsmac", REPO="investlab-test-pages";
const WORKFLOW="test-offline-ledger.yml", ARTIFACT="investlab-test-yahoo-review-candidate";
export async function findLatestYahooArtifact(fetcher=fetch){
 const base=`https://api.github.com/repos/${OWNER}/${REPO}`;
 const response=await fetcher(`${base}/actions/workflows/${WORKFLOW}/runs?branch=feature%2Ftest-navigation-20261112&status=success&per_page=10`,{headers:{Accept:"application/vnd.github+json"}});
 if(!response.ok)throw Error("GitHub Actions 목록 조회 실패: "+response.status);
 const data=await response.json();
 if(!Array.isArray(data.workflow_runs))throw Error("GitHub 응답 형식 오류");
 for(const run of data.workflow_runs){
  if(run.conclusion!=="success"||!Number.isSafeInteger(run.id))continue;
  const list=await fetcher(`${base}/actions/runs/${run.id}/artifacts?per_page=100`,{headers:{Accept:"application/vnd.github+json"}});
  if(!list.ok)continue;
  const artifacts=(await list.json()).artifacts;
  if(!Array.isArray(artifacts))continue;
  const item=artifacts.find(a=>a.name===ARTIFACT&&!a.expired&&Number.isSafeInteger(a.id));
  if(item)return {run_id:run.id,artifact_id:item.id,created_at:item.created_at,
   actions_url:`https://github.com/${OWNER}/${REPO}/actions/runs/${run.id}`,
   artifact_url:`https://github.com/${OWNER}/${REPO}/actions/runs/${run.id}/artifacts/${item.id}`,
   note:"GitHub artifact ZIP may require GitHub sign-in. No direct browser JSON fetch."};
 }
 throw Error("사용 가능한 Yahoo 검증 파일이 없습니다.");
}
