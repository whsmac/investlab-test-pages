// Read-only hypothetical conversion of the strategy's allocated assets only.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function partialConversion(s,quotes,{sellPct={},buyPct=100,useExistingUsd=false,costUsd=0}={}){
 if(s?.target?.kind!=='stock'||!Array.isArray(s.assets))throw Error('주식 목표 전략만 분할 전환을 지원합니다.');
 if(!finite(buyPct)||buyPct<0||buyPct>100||!finite(costUsd)||costUsd<0)throw Error('재매수 비율·비용 입력값 오류');
 const get=t=>{const p=quotes.get(t)?.price;if(!finite(p)||p<=0)throw Error(t+' 유효 시세 미확인');return p};
 const target=s.target.symbol,price=get(target),rows=[];let currentTarget=0,existingUsd=0,existingKrw=0,gross=0;
 for(const a of s.assets){
  if(!finite(a.quantity)||a.quantity<0)throw Error('운용자산 수량 오류');
  if(a.kind==='cash'){if(a.symbol==='USD')existingUsd+=a.quantity;else if(a.symbol==='KRW')existingKrw+=a.quantity;else throw Error('현금 통화 오류');continue}
  if(a.kind!=='stock')throw Error('운용자산 종류 오류');
  if(a.symbol===target){currentTarget+=a.quantity;continue}
  const pct=sellPct[a.symbol]??0;
  if(!finite(pct)||pct<0||pct>100)throw Error('매도 비율 범위 오류');
  const sold=pct===100?a.quantity:Math.floor(a.quantity*pct/100+1e-10),proceeds=sold*get(a.symbol);
  gross+=proceeds;rows.push({symbol:a.symbol,held:a.quantity,sold,remaining:a.quantity-sold,price:get(a.symbol),proceeds});
 }
 const usable=gross+(useExistingUsd?existingUsd:0);
 if(costUsd>usable+1e-8)throw Error('예상 비용이 사용 가능한 매도대금·현금보다 큽니다.');
 const net=Math.max(0,usable-costUsd),bought=Math.floor(net*buyPct/100/price+1e-10),remainingUsd=existingUsd+gross-costUsd-bought*price;
 return {rows,target,targetPrice:price,currentTarget,bought,totalTarget:currentTarget+bought,gross,costUsd,remainingUsd:Math.max(0,remainingUsd),existingKrw,remainingStockValue:rows.reduce((n,r)=>n+r.remaining*r.price,0)};
}
export function reviseStockGoal(s,mode,value){
 if(s?.status!=='active'||s.target.kind!=='stock'||!['growth','direct'].includes(mode)||!finite(value)||value<=0||mode==='direct'&&(!Number.isInteger(value)||value<=s.baseline.quantity))throw Error('목표 수량은 최초 수량보다 큰 정수 또는 양의 증가율을 입력하세요.');
 const {goalProvisional,...rest}=s;return {...rest,target:{...s.target,mode,value}};
}
