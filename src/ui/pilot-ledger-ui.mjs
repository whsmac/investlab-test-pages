import {projectLedger} from '../ledger/pilot-portfolio-projection.mjs';

// Presentation helpers only. All edits go through the parent page's existing validator and save flow.
export const ledgerTypeNames={OPEN:'초기 보유',BUY:'매수',SELL:'매도',DEPOSIT:'입금',WITHDRAW:'출금',DIVIDEND:'배당',FX:'환전'};
export function effectiveRate(currency,amount,toCurrency,toAmount){
 const from=Number(amount),to=Number(toAmount);
 if(!(from>0)||!(to>0)||currency===toCurrency)return null;
 if(currency==='KRW'&&toCurrency==='USD')return from/to;
 if(currency==='USD'&&toCurrency==='KRW')return to/from;
 return null;
}
export function createLedgerUi({getDb,save,msg,onEdit,onDelete}){
 const $=id=>document.getElementById(id),fmt=(n,d=2)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
 let historyPage=0;
 function symbols(category){
  const db=getDb();
  const held=projectLedger(db,'ALL').holdings.map(h=>h.symbol);
  const traded=db.entries.filter(e=>['OPEN','BUY','SELL'].includes(e.type)&&e.symbol).map(e=>e.symbol);
  // Watchlist is stored inside this authenticated user's ledger document; never read global browser keys.
  const watched=Array.isArray(db.watchlist)?db.watchlist:[];
  const items=category==='held'?held:category==='watch'?watched:category==='past'?traded:[];
  return [...new Set(items.map(t=>String(t).trim().toUpperCase()).filter(Boolean))].sort();
 }
 function refreshSymbols(){
  const category=$('entrySymbolCategory').value,manual=category==='manual',picker=$('entrySymbolPick'),previous=picker.value;
  $('symbolPickWrap').hidden=manual;$('symbolManualWrap').hidden=!manual;
  if(manual)return;
  const available=symbols(category);
  picker.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=available.length?'종목 선택':'목록 없음 · 직접입력 선택';picker.append(placeholder);
  for(const symbol of available){const option=document.createElement('option');option.value=symbol;option.textContent=symbol;picker.append(option);}
  picker.value=available.includes(previous)?previous:'';
 }
 function selectSymbolForEdit(symbol){
  const ticker=String(symbol||'').toUpperCase();
  const category=['held','watch','past'].find(cat=>symbols(cat).includes(ticker))||'manual';
  $('entrySymbolCategory').value=category;refreshSymbols();
  if(category==='manual')$('entrySymbol').value=ticker;else $('entrySymbolPick').value=ticker;
 }
 function updateFx(){
  if($('entryType').value!=='FX')return;
  const rate=effectiveRate($('entryCurrency').value,$('entryAmount').value,$('entryToCurrency').value,$('entryToAmount').value);
  $('fxEffectiveRate').textContent=rate?'1 USD = '+fmt(rate,4)+' KRW (수수료 포함)':'환전 금액을 입력하면 적용환율이 표시됩니다.';
 }
 function renderAccounts(){
  const root=$('accounts'),db=getDb();root.replaceChildren();
  if(!db.accounts.length){root.textContent='등록된 계좌가 없습니다.';return;}
  for(const a of db.accounts){
   const wrap=document.createElement('div');wrap.className='account-chip';const title=document.createElement('span');title.textContent=a.name+' ('+a.type+')';wrap.append(title);
   const rename=document.createElement('button');rename.type='button';rename.textContent='이름 변경';
   rename.onclick=()=>{const value=prompt('변경할 계좌 이름',a.name);if(value===null)return;const name=value.trim();if(!name||name===a.name)return;if(name.length>80||db.accounts.some(x=>x.id!==a.id&&x.name===name)){msg('계좌 이름이 중복되거나 너무 깁니다.');return;}a.name=name;save();msg('계좌 이름을 변경했습니다. 서버 저장 상태를 확인하세요.');};
   const del=document.createElement('button');del.type='button';del.textContent='삭제';
   // Remove only accounts with no trades; retain the shared db object for the parent.
   del.onclick=()=>{if(db.entries.some(e=>e.accountId===a.id)){msg('거래가 있는 계좌는 삭제할 수 없습니다.');return;}if(!confirm('거래가 없는 계좌 '+a.name+'을 삭제하시겠습니까?'))return;db.accounts.splice(db.accounts.findIndex(x=>x.id===a.id),1);save();msg('계좌를 삭제했습니다.');};
   wrap.append(rename,del);root.append(wrap);
  }
 }
 function renderWatchlist(){
  const db=getDb(),root=$('watchList');root.replaceChildren();
  for(const ticker of Array.isArray(db.watchlist)?db.watchlist:[]){
   const chip=document.createElement('div');chip.className='account-chip';
   const label=document.createElement('span');label.textContent=ticker;
   const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';
   remove.onclick=()=>{if(!confirm(ticker+' 관심종목을 삭제하시겠습니까?'))return;db.watchlist=db.watchlist.filter(x=>x!==ticker);save();};
   chip.append(label,remove);root.append(chip);
  }
 }
 function renderHistory(){
  const db=getDb(),select=$('historyAccount'),previous=select.value;
  select.replaceChildren();const all=document.createElement('option');all.value='ALL';all.textContent='전체 계좌';select.append(all);
  for(const account of db.accounts){const o=document.createElement('option');o.value=account.id;o.textContent=account.name;select.append(o);}
  select.value=db.accounts.some(a=>a.id===previous)?previous:'ALL';
  const start=$('historyStart').value,end=$('historyEnd').value,account=select.value;
  const items=[...db.entries].filter(e=>(account==='ALL'||e.accountId===account)&&(!start||e.date>=start)&&(!end||e.date<=end))
   .sort((a,b)=>b.date.localeCompare(a.date)||Number(b.created||0)-Number(a.created||0));
  const pages=Math.max(1,Math.ceil(items.length/5));historyPage=Math.min(historyPage,pages-1);
  const view=items.slice(historyPage*5,historyPage*5+5);
  $('historyPageLabel').textContent=(historyPage+1)+' / '+pages;
  $('historyPrev').disabled=historyPage===0;$('historyNext').disabled=historyPage>=pages-1;
  $('historyStatus').textContent=(start||end?'기간 조회 · ':'최근 거래 · ')+items.length+'건 중 '+(view.length?historyPage*5+1:0)+'~'+(historyPage*5+view.length)+'건 표시';
  const tbody=$('transactions');tbody.replaceChildren();
  for(const e of view){
   const tr=document.createElement('tr'),name=db.accounts.find(a=>a.id===e.accountId)?.name||'미확인';
   const rate=e.type==='FX'?effectiveRate(e.currency,e.amount,e.toCurrency,e.toAmount):null;
   const amount=e.type==='FX'?fmt(e.amount)+' → '+fmt(e.toAmount):(['OPEN','BUY','SELL'].includes(e.type)?'—':fmt(e.amount));
   for(const val of [name+' / '+e.date,ledgerTypeNames[e.type]||e.type,e.symbol||'—',e.qty?fmt(e.qty,6):'—',e.price?fmt(e.price,4):'—',amount,e.type==='FX'?e.currency+' → '+e.toCurrency:e.currency,rate?fmt(rate,4)+' KRW/USD':'—']){
    const td=document.createElement('td');td.textContent=val;tr.append(td);
   }
   const td=document.createElement('td');
   const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.style.width='auto';edit.style.marginRight='6px';edit.onclick=()=>onEdit(e);
   const del=document.createElement('button');del.type='button';del.textContent='삭제';del.style.width='auto';del.onclick=()=>onDelete(e);
   td.append(edit,del);tr.append(td);tbody.append(tr);
  }
 }
 function attach(){
  $('watchAdd').onclick=()=>{
   const db=getDb(),ticker=$('watchSymbol').value.trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,15}$/.test(ticker)){msg('관심종목 코드를 확인하세요.');return;}
   const watchlist=Array.isArray(db.watchlist)?db.watchlist:[];
   if(watchlist.includes(ticker)){msg('이미 등록된 관심종목입니다.');return;}
   db.watchlist=[...watchlist,ticker];$('watchSymbol').value='';save();msg('관심종목에 '+ticker+'을 추가했습니다.');
  };

  $('historyAccount').onchange=()=>{historyPage=0;renderHistory();};
  $('historyStart').onchange=()=>{historyPage=0;renderHistory();};
  $('historyEnd').onchange=()=>{historyPage=0;renderHistory();};
  $('historyReset').onclick=()=>{$('historyStart').value='';$('historyEnd').value='';$('historyAccount').value='ALL';historyPage=0;renderHistory();};
  $('historyPrev').onclick=()=>{historyPage=Math.max(0,historyPage-1);renderHistory();};
  $('historyNext').onclick=()=>{historyPage++;renderHistory();};
  $('entrySymbolCategory').onchange=refreshSymbols;
  for(const id of ['entryAmount','entryToAmount','entryCurrency','entryToCurrency'])$(id).addEventListener('input',updateFx);
 }
 attach();
 return {renderAccounts,renderHistory,renderWatchlist,refreshSymbols,selectSymbolForEdit,updateFx};
}
