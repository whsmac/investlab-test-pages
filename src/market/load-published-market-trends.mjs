import {parseMarketTrendsReport} from "./market-trends-model.mjs";
export async function loadPublishedMarketTrends({fetcher=fetch,origin,today=new Date()}={}){
 if(!origin)throw Error("TEST 페이지 주소가 필요합니다");
 const root=new URL(origin);
 if(root.protocol!=="https:"||root.hostname!=="whsmac.github.io"||
 !root.pathname.startsWith("/investlab-test-pages/"))throw Error("허용되지 않은 TEST 페이지");
 const url=new URL("./data/market-trends-public-review.json",root);
 if(url.pathname!=="/investlab-test-pages/data/market-trends-public-review.json"||
 url.origin!==root.origin||url.search||url.hash)throw Error("허용되지 않은 데이터 경로");
 const response=await fetcher(url.href,{cache:"no-store",credentials:"omit",redirect:"error"});
 if(!response.ok)throw Error(response.status===404?"시장 동향 자동수집 파일 미게시":"시장 동향 자료 HTTP "+response.status);
 const mime=String(response.headers?.get?.("content-type")||"").toLowerCase();
 if(!mime.includes("json"))throw Error("시장 동향 자료 JSON 형식 오류");
 return parseMarketTrendsReport(await response.json(),{today});
}
