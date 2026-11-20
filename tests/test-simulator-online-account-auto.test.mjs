import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');

test('TEST online ledger account selector is visible and unique',()=>{
 for(const id of ['pilotLedgerAccount','loadPilotLedgerCloud','pilotLedgerLoadStatus','onlineLedgerPreviewStatus'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must be unique');
 assert.match(html,/<section class="panel quick-panel"><h2>현재 투자현황<\/h2><label id="pilotLedgerAccountLabel" for="pilotLedgerAccount">/);
 assert.match(html,/onlineAccountLedger\?\.ledger\|\|null/);
 assert.match(html,/byId\('pilotLedgerAccount'\)\.addEventListener\('change'/);
});
test('only authenticated TEST owner ledger is read for automatic opening',()=>{
 assert.match(html,/async function refreshOnlineAccountLedger\(\)/);
 assert.match(html,/getOnlineScenarioConnection\(\)/);
 assert.match(html,/from\('investlab_pilot_ledger_documents'\)\.select\('payload,updated_at'\)\.eq\('user_id',userId\)\.maybeSingle\(\)/);
 assert.match(html,/verify\.data\?\.user\?\.id!==userId/);
 assert.match(html,/validateLedger\(ledger\)/);
 assert.match(html,/projectLedger\(ledger,accountId\)/);
 assert.match(html,/window\.addEventListener\('pageshow',\(\)=>\{void refreshOnlineAccountLedger\(\);\}\)/);
});
test('existing simulator draft, explicit handoff and user editing block automatic overwrite',()=>{
 assert.match(html,/mayAutoApplyTestLedger\(\{/);
 assert.match(html,/hasDraft:Boolean\(activeSimulatorOwnerId&&localStorage\.getItem\(ownerStorageKey\(DRAFT_KEY\)\)\)/);
 assert.match(html,/ownerChanged:onlineLedgerOwnerChanged/);
 assert.match(html,/onlineLedgerUserEdited=true/);
 assert.match(html,/scheduleWorkingDraft\(\);void refreshCurrentQuotes\(\);/);
 assert.match(html,/저장된 임시작업은 자동으로 덮어쓰지 않습니다/);
 assert.match(html,/실제 원장 변경 없음/);
 assert.match(html,/ownerStorageKey\(SCENARIO_STORAGE_KEY\)/);
 assert.match(html,/id="adoptLegacySimulator"/);
});
test('simulator charts reuse the same authenticated TEST session storage key as other modules',()=>{
 assert.match(html,/const client=window\.supabase\.createClient\(cfg\.url,cfg\.key,\{auth:\{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'investlab_shared_data_auth_v1'\}\}\)/);
});
