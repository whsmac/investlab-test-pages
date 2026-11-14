// TEST-only read model for My Portfolio and Unified Ledger from one ledger snapshot.
// No network calls, writes, inferred market prices or realized P&L.
import {projectPortfolioFromLedger} from './ledger-portfolio-projection.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEC=/^(0|[1-9][0-9]*)\.([0-9]{8})$/;
function integerShares(value){
 if(typeof value!=='string'||!DEC.test(value))throw Error('invalid quantity');
 const [whole,fraction]=value.split('.');
 return /^0{8}$/.test(fraction)?whole:null;
}
function accountView(account){
 return Object.freeze({
  accountId:account.accountId,name:account.name,
  holdings:account.positions.map(p=>Object.freeze({ticker:p.ticker,quantity:p.quantity,quantityDisplay:integerShares(p.quantity)??p.quantity})),
  cash:account.cash.map(c=>Object.freeze({currency:c.currency,balance:c.balance}))
 });
}
export function buildPortfolioLedgerView({sessionUserId,accounts,committedEvents=[],selectedAccountId=null}={}){
 const portfolio=projectPortfolioFromLedger({sessionUserId,accounts,committedEvents});
 if(selectedAccountId!==null&&(typeof selectedAccountId!=='string'||!UUID.test(selectedAccountId)))throw Error('invalid selected account ID');
 const selected=selectedAccountId?.toLowerCase()??null;
 const accountViews=portfolio.accounts.map(accountView);
 if(selected&&!accountViews.some(a=>a.accountId===selected))throw Error('selected account is not owned by session user');
 const selectedView=selected?accountViews.find(a=>a.accountId===selected):null;
 const holdings=selectedView?selectedView.holdings:portfolio.positions.map(p=>Object.freeze({ticker:p.ticker,quantity:p.quantity,quantityDisplay:integerShares(p.quantity)??p.quantity}));
 const cash=selectedView?selectedView.cash:portfolio.cash;
 return Object.freeze({
  status:'OFFLINE_UI_READ_MODEL_ONLY',source:'UNIFIED_LEDGER_EVENTS',
  selectedAccountId:selected,accounts:accountViews,holdings,cash,
  totalAccountCount:accountViews.length,canPersist:false,serverVerified:false,
  valuationAvailable:false,profitLossAvailable:false,
  note:'Prices, cost basis, valuation and realized gains require separately verified inputs'
 });
}
