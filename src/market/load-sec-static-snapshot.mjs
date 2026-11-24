// TEST review snapshot only. The digest pins the reviewed initial dataset,
// not an SEC signature or full filing reconciliation.
import {validateLocalSecChartReview,fields} from './sec-local-chart-review.mjs';
export const SNAPSHOT_PATH='./data/sec-financial-review-20261124.txt';
export const SNAPSHOT_SHA256='62af62179792df99f45a4b1b5e81a900778f9ee16c8d9dbdb8a90827866ac1b8';
const CIK={MSFT:789019,GOOGL:1652044,AMZN:1018724,META:1326801,TSLA:1318605,SPCX:1181412};
const codes={A:'source_arithmetic_checked',Z:'zip_match',D:'definition_review',M:'missing'};
const counts={MSFT:23,GOOGL:22,AMZN:23,META:23,TSLA:22,SPCX:4};
export function decodeSecSnapshot(raw){
 if(typeof raw!=='string'||raw.length!==8425||!raw.endsWith('\n'))throw Error('SEC 검토 파일 크기 오류');
 let ticker=null,accessions=[];const seen=new Set(),rows=[];
 for(const line of raw.slice(0,-1).split('\n')){
  if(line.startsWith('@')){
   const m=/^@([A-Z]+) ([0-9,]+)$/.exec(line);
   if(!m||!Object.hasOwn(CIK,m[1])||seen.has(m[1]))throw Error('SEC 기업 구분 오류');
   ticker=m[1];seen.add(ticker);accessions=m[2].split(',');
   if(accessions.some(v=>!/^\d{18}$/.test(v))||new Set(accessions).size!==accessions.length)throw Error('공시 번호 오류');
   continue;
  }
  const parts=line.split('|');
  if(!ticker||parts.length!==10||!/^[AZDM]{4}$/.test(parts[6]))throw Error('SEC 분기 자료 형식 오류');
  const r={ticker,period_end:parts[0],fiscal_period:parts[1],status:'SEC_LOCAL_REVIEW',metric_status:{},filing_urls:{}};
  fields.forEach((f,i)=>{
   const n=parts[i+2];
   if(n!=='-'&&!/^-?\d+$/.test(n))throw Error('금액 형식 오류');
   r[f]=n==='-'?null:Number(n)/1000;
   r.metric_status[f]=codes[parts[6][i]];
   if(i<3){
    const refs=parts[7+i];
    if(refs!=='-'){
     const indices=refs.split('+');
     if(indices.length>2||indices.some(v=>!/^\d+$/.test(v)||!accessions[Number(v)]))throw Error('공시 참조 오류');
     r.filing_urls[f]=indices.map(v=>'https://www.sec.gov/Archives/edgar/data/'+CIK[ticker]+'/'+accessions[Number(v)]+'/');
    }
   }
  });
  rows.push(r);
 }
 if(rows.length!==117||Object.entries(counts).some(([t,n])=>rows.filter(r=>r.ticker===t).length!==n))throw Error('SEC 초기 자료 건수 불일치');
 return validateLocalSecChartReview({format:'INVESTLAB_SEC_LOCAL_CHART_REVIEW_V1',source:'SEC Company Facts / user supplied archive',as_of:'2026-11-24',publication_allowed:false,database_writes:0,rows});
}
export async function loadSecStaticSnapshot({fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(!subtle)throw Error('검토 자료 무결성 확인 불가');
 const r=await fetcher(SNAPSHOT_PATH,{cache:'no-store',credentials:'omit',redirect:'error'});
 if(!r.ok)throw Error('SEC 검토 파일 HTTP '+r.status);
 const bytes=await r.arrayBuffer();
 if(bytes.byteLength!==8425)throw Error('SEC 검토 파일 크기 오류');
 const hash=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==SNAPSHOT_SHA256)throw Error('SEC 검토 파일 식별값 불일치');
 return decodeSecSnapshot(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
