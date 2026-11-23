// Explicit user forecasts for a simulated trade. Prices are USD, not market quotes.
const FIELDS=Object.freeze({bear:"bearPrice",bull:"bullPrice"});
const SYMBOL=/^[A-Z][A-Z0-9.-]{0,14}$/;
export function validForecastPrice(value){
 return value!==""&&value!==null&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>0;
}
export function forecastTarget(prices,ticker,phase){
 const field=FIELDS[phase];
 if(!field)return null;
 const symbol=String(ticker||"").trim().toUpperCase();
 const row=(prices||[]).find(p=>String(p?.ticker||"").trim().toUpperCase()===symbol);
 if(!row||!validForecastPrice(row[field]))return null;
 return Number(row[field]);
}
export function forecastSnapshot(prices){
 const result={};
 for(const row of prices||[]){
  const ticker=String(row?.ticker||"").trim().toUpperCase();
  if(!SYMBOL.test(ticker))continue;
  const bear=validForecastPrice(row.bearPrice)?Number(row.bearPrice):null;
  const bull=validForecastPrice(row.bullPrice)?Number(row.bullPrice):(row.bullPrice===undefined&&validForecastPrice(row.price)?Number(row.price):null);
  if(bear===null&&bull===null)continue;
  result[ticker]={...(bear===null?{}:{bear}),...(bull===null?{}:{bull})};
 }
 return result;
}
export function validateForecastSnapshot(targets){
 if(targets===undefined)return {};
 if(!targets||typeof targets!=="object"||Array.isArray(targets)||Object.keys(targets).length>300)
  throw Error("가상거래 예상 목표 주가 형식 오류");
 const clean={};
 for(const [ticker,values] of Object.entries(targets)){
  if(!SYMBOL.test(ticker)||!values||typeof values!=="object"||Array.isArray(values))
   throw Error("예상 목표 주가 종목 형식 오류: "+ticker);
  if(Object.keys(values).some(key=>!["bear","bull"].includes(key)))
   throw Error("예상 목표 주가 종류 오류: "+ticker);
  const prices={};
  for(const [key,value] of Object.entries(values)){
   if(!validForecastPrice(value)||typeof value!=="number")
    throw Error("예상 목표 주가는 0보다 큰 숫자여야 합니다: "+ticker);
   prices[key]=value;
  }
  if(Object.keys(prices).length)Object.defineProperty(clean,ticker,{value:prices,enumerable:true,writable:true,configurable:true});
 }
 return clean;
}
export function restoreForecastSnapshot(prices,targets){
 const safe=validateForecastSnapshot(targets);
 const result=(prices||[]).map(p=>({...p}));
 const map=new Map(result.map(p=>[String(p.ticker||"").toUpperCase(),p]));
 for(const [ticker,forecast] of Object.entries(safe)){
  let row=map.get(ticker);
  if(!row){row={ticker,price:""};result.push(row);map.set(ticker,row);}
  if(forecast.bear!==undefined)row.bearPrice=forecast.bear;
  if(forecast.bull!==undefined){row.bullPrice=forecast.bull;row.price=forecast.bull;}
 }
 return result;
}
export function assignForecastToTrade(trade,prices,phase){
 if(!["bear","bull"].includes(phase))throw Error("가정 가격 유형을 선택하세요");
 const price=forecastTarget(prices,trade.ticker,phase);
 if(price===null)throw Error(trade.ticker+" "+(phase==="bear"?"하락":"상승")+" 예상 목표 주가를 먼저 입력하세요");
 return {...trade,price,priceBasis:phase};
}
