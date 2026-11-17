// Fetch only a same-origin, explicitly published TEST Yahoo review JSON.
// CI artifacts are NOT web-hosted JSON. This function never accesses GitHub ZIP APIs.
export async function loadPublishedYahooReview({fetcher=fetch, origin, path="./data/yahoo-public-review.json"}={}) {
  if (!origin) throw Error("TEST 페이지 주소가 필요합니다.");
  const base = new URL(origin);
  if (base.protocol !== "https:" || base.hostname !== "whsmac.github.io" ||
      !base.pathname.startsWith("/investlab-test-pages/")) throw Error("허용되지 않은 TEST 호스트");
  const url = new URL(path, base);
  if (url.origin !== base.origin || !url.pathname.startsWith("/investlab-test-pages/data/") ||
      !url.pathname.endsWith("/yahoo-public-review.json")) throw Error("허용되지 않은 JSON 경로");
  const response = await fetcher(url.href,{cache:"no-store",credentials:"omit",redirect:"error"});
  if (response.status === 404) throw Error("주가 자동수집 파일이 아직 온라인 TEST에 게시되지 않았습니다 (HTTP 404). 기존 입력값을 유지합니다.");
  if (!response.ok) throw Error("온라인 TEST 주가 파일을 읽을 수 없습니다 (HTTP "+response.status+"). 기존 입력값을 유지합니다.");
  const contentType = response.headers?.get?.("content-type") || "";
  if (!contentType.toLowerCase().includes("json")) throw Error("주가 파일 응답이 JSON이 아닙니다. 기존 입력값을 유지합니다.");
  const report = await response.json();
  if (report?.mode !== "REVIEW_ONLY" || report?.source !== "Yahoo Finance" ||
      report.database_insert_authorized !== false || report.writes_performed !== 0 ||
      !Array.isArray(report.observations) || report.row_count !== report.observations.length ||
      report.row_count > 10000) throw Error("게시된 주가 파일 검증 실패");
  return report;
}
