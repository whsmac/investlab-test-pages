import {validateMarketBenchmarkReport} from "./market-index-validation.mjs";
export async function loadPublishedMarketIndices({fetcher=fetch,origin,path="./data/market-index-benchmarks.json",today=new Date()}={}){
 if(!origin)throw Error("TEST 사이트 주소가 필요합니다.");
 const base=new URL(origin);
 if(base.protocol!=="https:"||base.hostname!=="whsmac.github.io"||
    !base.pathname.startsWith("/investlab-test-pages/"))throw Error("허용되지 않은 TEST 호스트");
 const url=new URL(path,base);
 if(url.origin!==base.origin||url.pathname!=="/investlab-test-pages/data/market-index-benchmarks.json"||
    url.search||url.hash||url.username||url.password)throw Error("허용되지 않은 지수 데이터 경로");
 const response=await fetcher(url.href,{cache:"no-store",credentials:"omit",redirect:"error"});
 if(!response.ok)throw Error(response.status===404?"시장지수 자동수집 파일 미게시":"시장지수 HTTP "+response.status);
 if(!String(response.headers?.get?.("content-type")||"").toLowerCase().includes("json"))throw Error("시장지수 파일은 JSON이어야 합니다.");
 return validateMarketBenchmarkReport(await response.json(),{today});
}
