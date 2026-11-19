// TEST-only display model: quantity-weighted average acquisition cost across selected accounts.
// Missing cost on any nonzero position blocks a misleading combined average.
export function weightedAverageAcquisitionCost(ticker,accounts=[]){
 if(typeof ticker!=="string"||!ticker.trim()||!Array.isArray(accounts))throw Error("Invalid cost input");
 let quantity=0,basis=0,positions=0,missing=false;
 for(const account of accounts){
  if(!account||!Array.isArray(account.holdings))throw Error("Invalid account holdings");
  for(const holding of account.holdings){
   if(holding.ticker!==ticker)continue;
   const q=Number(holding.quantityDisplay),cost=holding.averageCostUsd;
   if(!Number.isFinite(q)||q<0)throw Error("Invalid quantity");
   if(q===0)continue;
   positions++;quantity+=q;
   if(cost===null||cost===undefined||String(cost).trim()===""){missing=true;continue;}
   const c=Number(cost);
   if(!Number.isFinite(c)||c<0)throw Error("Invalid acquisition cost");
   basis+=q*c;
  }
 }
 return {ticker,quantity,positions,averageCostUsd:!missing&&quantity>0?basis/quantity:null,
  costBasisUsd:!missing&&quantity>0?basis:null,complete:!missing&&quantity>0};
}
