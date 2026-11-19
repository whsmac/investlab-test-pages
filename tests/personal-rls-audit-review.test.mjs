import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizePersonalRlsAudit} from '../src/sync/personal-rls-audit-review.mjs';
const row={schema_name:'public',object_name:'personal_ledger',review_status:'POLICIES_PRESENT_MANUAL_REVIEW_REQUIRED',rls_enabled:true,policy_count:2,read_policy_count:1,write_policy_count:1,authenticated_select_grant:true,authenticated_insert_grant:true,authenticated_update_grant:false,authenticated_delete_grant:false};
test('even permissive-looking audit metadata never permits posting or syncing',()=>{
 const result=summarizePersonalRlsAudit([row]);
 assert.equal(result.objects,1);assert.equal(result.canPost,false);assert.equal(result.canSync,false);assert.equal(result.twoUserIsolationVerified,false);
});
test('empty or malformed audit results do not authorize writes',()=>{
 assert.equal(summarizePersonalRlsAudit([]).canPost,false);
 assert.throws(()=>summarizePersonalRlsAudit([{...row,rls_enabled:'true'}]));
 assert.throws(()=>summarizePersonalRlsAudit([{...row,review_status:'SAFE'}]));
 assert.throws(()=>summarizePersonalRlsAudit([row,row]));
});
test('audit review is local file only and uses textContent',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="rlsAuditFile"/);assert.match(html,/summarizePersonalRlsAudit\(JSON.parse\(await file.text\(\)\)\)/);
 assert.match(html,/li.textContent = item.name/);assert.match(html,/서버 저장 불가/);
});
