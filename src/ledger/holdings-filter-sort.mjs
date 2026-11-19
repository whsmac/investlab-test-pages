// Read-only holdings search and sorting. Never modifies ledger positions.
const SORTS=new Set(['symbol-asc','symbol-desc','quantity-desc','quantity-asc']);
const DEC=/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
function compareQuantity(a,b){
 const norm=v=>{const [whole,fraction='']=v.replace(/^\+/,'').split('.');return {whole:whole.replace(/^0+(?=\d)/,''),fraction:fraction.replace(/0+$/,'')};};
 const x=norm(a),y=norm(b),negativeA=x.whole.startsWith('-'),negativeB=y.whole.startsWith('-');
 if(negativeA!==negativeB)return negativeA?-1:1;
 const wx=x.whole.replace('-',''),wy=y.whole.replace('-','');
 let cmp=wx.length-wy.length||wx.localeCompare(wy,'en')||x.fraction.padEnd(Math.max(x.fraction.length,y.fraction.length),'0').localeCompare(y.fraction.padEnd(Math.max(x.fraction.length,y.fraction.length),'0'),'en');
 return negativeA?-Math.sign(cmp):Math.sign(cmp);
}
export function filterAndSortHoldings(holdings,{query='',sort='symbol-asc'}={}){
 if(!Array.isArray(holdings)||typeof query!=='string'||query.length>100||!SORTS.has(sort))throw Error('invalid holdings filter');
 const needle=query.trim().toUpperCase();
 const rows=holdings.map((h,index)=>{if(!h||typeof h.ticker!=='string'||!h.ticker.trim()||typeof h.quantityDisplay!=='string'||!DEC.test(h.quantityDisplay))throw Error('invalid holding row');return {...h,_index:index};}).filter(h=>h.ticker.toUpperCase().includes(needle));
 rows.sort((a,b)=>{const symbol=a.ticker.localeCompare(b.ticker,'en');const qty=compareQuantity(a.quantityDisplay,b.quantityDisplay);const result=sort==='symbol-asc'?symbol:sort==='symbol-desc'?-symbol:sort==='quantity-desc'?-qty:qty;return result||a._index-b._index;});
 return rows.map(({_index,...h})=>h);
}
