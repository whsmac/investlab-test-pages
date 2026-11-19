import {collectManagedSymbols,readManagedSymbols} from './managed-symbols.mjs';
import {extractPortfolioPositions,readPortfolioUsdCash} from './portfolio-positions.mjs';
export function readPortfolioSimulatorSnapshot(storage){
 const read=key=>{try{const value=JSON.parse(storage?.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return []}};
 const holdings=read('investlab_holdings');
 const symbols=collectManagedSymbols({holdings,watchlist:read('investlab_watchlist'),past:read('investlab_past_symbols')});
 const positions=extractPortfolioPositions(holdings);
 const usdCash=readPortfolioUsdCash(storage);
 return {symbols,positions,usdCash,source:'SAME_ORIGIN_LOCAL_STORAGE_READ_ONLY',crossDeviceSynced:false,serverVerified:false,canPost:false};
}
export function comparePortfolioSimulatorSnapshot({before,after}={}){
 if(!before||!after)throw Error('두 포트폴리오 스냅샷이 필요합니다');
 const positions=x=>new Map(x.positions.map(p=>[p.ticker,p]));
 const b=positions(before),a=positions(after);
 const changedPositions=[...new Set([...b.keys(),...a.keys()])].sort().filter(t=>JSON.stringify(b.get(t)??null)!==JSON.stringify(a.get(t)??null));
 const symbols=x=>new Map(x.symbols.map(s=>[s.ticker,s.categories.join('|')]));
 const bs=symbols(before),as=symbols(after);
 const changedSymbols=[...new Set([...bs.keys(),...as.keys()])].sort().filter(t=>bs.get(t)!==as.get(t));
 return {changedPositions,changedSymbols,cashChanged:before.usdCash!==after.usdCash,serverVerified:false,canPost:false};
}
