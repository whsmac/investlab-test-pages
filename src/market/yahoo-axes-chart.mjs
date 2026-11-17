// Accessible, read-only SVG chart with labelled date and USD price axes.
export function chartAxisModel(points,{width=680,height=210}={}){
 if(!Array.isArray(points)||points.length<2||points.some(p=>!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(p.close)||p.close<=0))throw Error("Invalid chart points");
 const margin={left:76,right:16,top:14,bottom:40};
 const plotWidth=width-margin.left-margin.right,plotHeight=height-margin.top-margin.bottom;
 const values=points.map(p=>p.close),min=Math.min(...values),max=Math.max(...values);
 const spread=max-min,pad=spread>0?spread*.12:Math.max(max*.02,.01);
 const lower=Math.max(0,min-pad),upper=max+pad;
 const x=i=>margin.left+i*plotWidth/(points.length-1);
 const y=v=>margin.top+(upper-v)*plotHeight/(upper-lower);
 const yTicks=Array.from({length:5},(_,i)=>({value:lower+(upper-lower)*i/4,y:y(lower+(upper-lower)*i/4)}));
 const indices=[0,Math.floor((points.length-1)/2),points.length-1];
 const xTicks=[...new Set(indices)].map(i=>({date:points[i].date,x:x(i)}));
 return {width,height,margin,plotWidth,plotHeight,yTicks,xTicks,
  path:points.map((p,i)=>`${x(i).toFixed(2)},${y(p.close).toFixed(2)}`).join(" ")};
}

export function renderYahooAxesChart(document,points,ticker){
 const model=chartAxisModel(points);
 const ns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(ns,"svg");
 svg.setAttribute("viewBox",`0 0 ${model.width} ${model.height}`);
 svg.setAttribute("role","img");
 svg.setAttribute("aria-label",`${ticker} 날짜별 종가(USD) 그래프, X축 거래일, Y축 USD 가격`);
 svg.style.cssText="width:100%;height:auto;display:block;background:#0d1424;border-radius:8px";
 const element=(tag,attrs,text)=>{
  const node=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
  if(text!==undefined)node.textContent=text;
  svg.append(node);return node;
 };
 const bottom=model.height-model.margin.bottom,left=model.margin.left;
 const priceLabel=new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
 for(const tick of model.yTicks){
  element("line",{x1:left,y1:tick.y,x2:model.width-model.margin.right,y2:tick.y,stroke:"#33415e","stroke-width":.8,"stroke-dasharray":"3 4"});
  element("text",{x:left-9,y:tick.y+4,fill:"#b9c9e8","font-size":12,"text-anchor":"end"},priceLabel.format(tick.value));
 }
 element("line",{x1:left,y1:model.margin.top,x2:left,y2:bottom,stroke:"#a5b8d9"});
 element("line",{x1:left,y1:bottom,x2:model.width-model.margin.right,y2:bottom,stroke:"#a5b8d9"});
 for(const tick of model.xTicks){
  element("line",{x1:tick.x,y1:bottom,x2:tick.x,y2:bottom+5,stroke:"#a5b8d9"});
  element("text",{x:tick.x,y:bottom+20,fill:"#b9c9e8","font-size":11,"text-anchor":tick.x===left?"start":tick.x===model.width-model.margin.right?"end":"middle"},tick.date.slice(5));
 }
 element("text",{x:12,y:12,fill:"#b9c9e8","font-size":11},"USD");
 element("text",{x:model.width-model.margin.right,y:model.height-5,fill:"#b9c9e8","font-size":11,"text-anchor":"end"},"거래일 (월-일)");
 element("polyline",{points:model.path,fill:"none",stroke:"#7ca7ff","stroke-width":2.2,"stroke-linecap":"round","stroke-linejoin":"round"});
 return svg;
}
