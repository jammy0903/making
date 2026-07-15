// 구글 트렌드 실시간 급상승 검색어(한국) 수집 — 발굴 1순위의 후보 공급 채널 A.
// 설계: docs/search-demand-design.md §3-A. 키·라이브러리 불필요(공개 RSS).
// 뉴스·인물이 대부분이므로 이 자체는 후보 "공급"일 뿐 — 판정은 데이터랩 "X 뜻" 검증이 한다.

import { fetchText, reason } from '../crawlers/http.js';

const RSS_URL = 'https://trends.google.com/trending/rss?geo=KR';

// 반환: [{ term, traffic }] — 실패 시 [] (파이프라인 격리: 다른 채널은 계속)
export async function fetchTrendingKR() {
  let xml;
  try {
    xml = await fetchText(RSS_URL);
  } catch (err) {
    console.warn('[gtrends] RSS 수집 실패(스킵):', reason(err));
    return [];
  }
  // <item> 블록 안의 <title>만 취한다 (채널 제목 "Daily Search Trends" 제외)
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>([^<]*)<\/title>/) || [])[1];
    const traffic = (block.match(/<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/) || [])[1];
    if (title && title.trim()) items.push({ term: title.trim(), traffic: traffic || null });
  }
  if (items.length === 0) console.warn('[gtrends] 파싱 결과 0건 — RSS 포맷 변경 가능성');
  return items;
}
