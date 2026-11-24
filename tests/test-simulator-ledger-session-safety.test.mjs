import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {differentVerifiedUser,mayAutoApplyTestLedger} from '../src/simulator/test-ledger-session-safety.mjs';

const cloud={firstRead:true,positions:[{ticker:'TSLA',quantity:3,averageCost:100}],cash:15};
test('TEST verified user switch blocks implicit owner mixing',()=>{
 assert.equal(differentVerifiedUser('user-a','user-b'),true);
 assert.equal(differentVerifiedUser('user-a','user-a'),false);
 assert.equal(differentVerifiedUser(null,'user-b'),false);
 assert.equal(differentVerifiedUser('user-a',null),false);
});
test('fresh populated cloud holdings OR USD cash may initialize an empty simulator',()=>{
 assert.equal(mayAutoApplyTestLedger(cloud),true);
 assert.equal(mayAutoApplyTestLedger({...cloud,positions:[],cash:250}),true);
 assert.equal(mayAutoApplyTestLedger({...cloud,positions:[],cash:0}),false);
 assert.equal(mayAutoApplyTestLedger({...cloud,positions:[],cash:-3}),false);
 assert.equal(mayAutoApplyTestLedger({...cloud,firstRead:false}),false);
});
test('drafts, explicit handoffs, editing and user change each block auto replacement',()=>{
 for(const field of ['hasDraft','explicitHandoff','userEdited','draftPending','ownerChanged']){
  assert.equal(mayAutoApplyTestLedger({...cloud,[field]:true}),false,field);
 }
});
test('TEST simulator clears owner cache on logout, rechecks session on focus, and fences shared account preview',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/getOnlineAccountOpening\(\)\{\s*if\(!onlineAccountLedger\|\|onlineAccountLedger\.userId!==lastVerifiedOnlineUserId\)return null/);
 assert.match(html,/if\(!connection\)\{onlineAccountLedger=null;disconnectSimulatorQuotes\(\);refreshManagedSymbols\(\);refreshPilotLedgerAccountOptions\(\)/);
 assert.match(html,/differentVerifiedUser\(lastVerifiedOnlineUserId,userId\)/);
 assert.match(html,/mayAutoApplyTestLedger\(\{/);
 assert.match(html,/ownerChanged:onlineLedgerOwnerChanged/);
 assert.match(html,/window\.addEventListener\('focus',\(\)=>\{void refreshOnlineAccountLedger\(\);void loadScenariosOnline\(\)/);
 assert.match(html,/investlab_shared_data_auth_v1/);
 assert.match(html,/id="pilotLedgerAccountLabel"/);
});
