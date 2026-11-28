// Responsive SVG with explicit missing-point breaks, keyboard focus and native tooltips.
const ns='http://www.w3.org/2000/svg',svg=(tag,attrs={},txt)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(txt!==undefined)n.textContent=txt;return n};
export function drawTrackerChart(root,rows,series,{title='성과 추세',digits=1}={}){
 root.replaceChildren();const numbers=rows.flatMap(r=>series.map(s=>r[s.key])).filter(Number.isFinite);
 if(!rows.length||!numbers.length){root.textContent='확인 가능한 자료 없음';return;}
 const width=720,height=250,l=95,r=20,t=20,b=36;let min=Math.min(...numbers),max=Math.max(...numbers);if(min===max){const delta=Math.max(Math.abs(min)*.05,1);min-=delta;max+=delta}
 const x=i=>l+(rows.length===1?(width-l-r)/2:i*(width-l-r)/(rows.length-1)),y=v=>height-b-(v-min)/(max-min)*(height-t-b);
 const f=v=>v.toLocaleString('en-US',{maximumFractionDigits:digits}),g=svg('svg',{viewBox:'0 0 720 250',role:'img','aria-label':title});g.style.cssText='width:100%;height:auto;min-height:150px;display:block';
 for(let k=0;k<=4;k++){const v=min+(max-min)*k/4,yy=y(v);g.append(svg('line',{x1:l,x2:width-r,y1:yy,y2:yy,stroke:'#34415e'}),svg('text',{x:l-8,y:yy+4,'text-anchor':'end',fill:'#bac8df','font-size':12},f(v)))}
 for(const i of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])])g.append(svg('text',{x:x(i),y:height-10,'text-anchor':rows.length===1?'middle':i===0?'start':i===rows.length-1?'end':'middle',fill:'#bac8df','font-size':12},rows[i].date));
 const colors=['#80b6ff','#61d7a8','#e9b66e','#c5a2f5','#f38b9e','#a5b5d0'];
 series.forEach((s,j)=>{let d='',prev=false;const color=s.color||colors[j%colors.length];for(let i=0;i<rows.length;i++){const v=rows[i][s.key];if(!Number.isFinite(v)){prev=false;continue}d+=(prev?'L':'M')+x(i)+' '+y(v)+' ';prev=true;if(rows.length===1||!Number.isFinite(rows[i-1]?.[s.key])&&!Number.isFinite(rows[i+1]?.[s.key]))g.append(svg('circle',{cx:x(i),cy:y(v),r:3,fill:color}));}g.append(svg('path',{d,fill:'none',stroke:color,'stroke-width':2.4,'stroke-dasharray':s.dashed?'5 4':'none'}))});
 const cursor=svg('line',{x1:l,x2:l,y1:t,y2:height-b,stroke:'#c3cfe2','stroke-dasharray':'4 4',visibility:'hidden'});g.append(cursor);const detail=document.createElement('p');detail.className='muted';detail.setAttribute('aria-live','polite');
 function pick(i){i=Math.max(0,Math.min(rows.length-1,i));const row=rows[i];cursor.setAttribute('x1',x(i));cursor.setAttribute('x2',x(i));cursor.setAttribute('visibility','visible');detail.textContent=row.date+' · '+series.map(s=>s.label+' '+(Number.isFinite(row[s.key])?f(row[s.key]):'미확인')).join(' / ');return i}
 let selected=rows.length-1;g.setAttribute('tabindex','0');g.addEventListener('pointermove',event=>{const rect=g.getBoundingClientRect();selected=pick(Math.round(((event.clientX-rect.left)*width/rect.width-l)/(width-l-r)*(rows.length-1)))});g.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();selected=pick(selected+(e.key==='ArrowRight'?1:-1))}});
 const legend=document.createElement('p');series.forEach((s,j)=>{const span=document.createElement('span');span.style.color=s.color||colors[j%colors.length];span.textContent='● '+s.label+'　';legend.append(span)});root.append(g,legend,detail);pick(selected);
}
