// Pinterest 크롤러 (비공식 내부 검색 API — 직접 스크래핑)
//
// 공식 Pinterest API(v5)는 "내 계정 데이터"만 주고 공개 핀 검색 엔드포인트가 없다.
// 그래서 API 키 없이 브라우저가 쓰는 내부 리소스(BaseSearchResource)를 직접 호출한다.
// 주제별 검색어로 핀을 모아 "제목이 100% 한국어인 핀"만 골라 이미지 URL과 함께 수집한다.
//
// 검색어 전략(하이브리드):
//   1) memes 테이블에 status='steady'인 밈이 있으면 그 이름을 검색어로 쓴다.
//      → "사전 대조 측정" 아키텍처와 정합(등록된 스테디 밈을 핀터레스트에서 직접 측정).
//   2) 스테디 밈이 없거나(현재 상태) DB 미연결이면, 스테디 밈 성지 검색어로 폴백한다.
//      성지 검색어는 실측 순한글 수율이 높은 것 위주(무한도전이 압도적).
//
// ⚠️ 비공식 경로 + 로그 미출력: 이 크롤러는 콘솔에 아무 로그도 남기지 않는다.
//    (실패해도 조용히 []를 반환 — 다른 소스/서버에는 영향 없음. 대신 실패가 로그에 안 드러남)
//
// 선택 환경변수: PINTEREST_COOKIE (로그인 세션 쿠키). 없어도 공개 검색은 동작한다.

import * as supa from '../supabase.js';

const SOURCE = 'pinterest';
const ENDPOINT = 'https://www.pinterest.com/resource/BaseSearchResource/get/';

const PAGE_SIZE = 25;        // 검색 1회에 가져올 핀 수
const MAX_TEXT_LEN = 200;    // 긴 제목은 잘라 밈 표현에 집중
const MAX_QUERIES = 12;      // 핀터레스트 과호출/차단 방지 — 검색어 상한(스테디 밈이 많아도 여기서 자름)

// 스테디 밈이 없을 때 쓰는 폴백 검색어. 실측 순한글 수율(25개당, 괄호) 순으로 배치.
//   오늘의짤방(20, 한국 밈 애그리게이터) · 무한도전 짤(13) · 박명수 짤(10) · 정형돈 짤(10)
//   무한도전 명장면(9) · 1박2일 짤(9) · 웃긴 짤방(9) · 웃긴사진 모음(8) · 유재석 짤(7)
//   노홍철 짤(7) · 예능 짤(6). 수율 낮고 노이즈 많은 것(개그콘서트·리액션·강아지 등)은 제외.
const FALLBACK_QUERIES = [
  '오늘의짤방',
  '무한도전 짤',
  '박명수 짤',
  '정형돈 짤',
  '무한도전 명장면',
  '1박2일 짤',
  '웃긴 짤방',
  '웃긴사진 모음',
  '유재석 짤',
  '노홍철 짤',
  '예능 짤',
];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
  'X-Pinterest-PWS-Handler': 'www/search/[scope].js',
};

// 제목이 "100% 한국어"인지 판단.
// 글자(letter)로 치는 문자(한글·영문·일문·한자) 중 한글이 아닌 게 하나도 없어야 한다.
// 숫자·기호·이모지·공백은 글자로 안 세므로 "웃긴 짤!! 😂" 같은 건 통과한다.
function isPureKorean(text) {
  const kr = (text.match(/[가-힣]/g) || []).length;
  const foreign = (text.match(/[a-zA-Zぁ-んァ-ヶ一-龥]/g) || []).length;
  return kr > 0 && foreign === 0;
}

// 핀에서 최고 해상도 이미지 URL을 뽑는다 (orig → 736x → 474x 순).
function pickImage(pin) {
  const imgs = pin.images || {};
  return imgs.orig?.url || imgs['736x']?.url || imgs['474x']?.url || null;
}

// 검색어 목록 결정: 스테디 밈 이름 우선, 없으면/실패 시 성지 폴백.
async function buildQueries() {
  try {
    const memes = await supa.fetchSteadyMemes();
    const names = memes.map((m) => (m.name || '').trim()).filter((n) => n.length >= 2);
    if (names.length) return names.slice(0, MAX_QUERIES);
  } catch {
    // DB 미연결/status 컬럼 없음 등 → 폴백 (로그 미출력)
  }
  return FALLBACK_QUERIES;
}

// 한 검색어에서 핀을 검색해 "순한글 제목 + 이미지"를 수집
async function crawlQuery(q, cookie) {
  const data = { options: { query: q, scope: 'pins', page_size: PAGE_SIZE }, context: {} };
  const url =
    `${ENDPOINT}?source_url=${encodeURIComponent('/search/pins/?q=' + q)}` +
    `&data=${encodeURIComponent(JSON.stringify(data))}`;

  const headers = cookie ? { ...HEADERS, Cookie: cookie } : HEADERS;
  const res = await fetch(url, { headers });
  if (!res.ok) return []; // 실패는 조용히 건너뜀 (로그 미출력)

  const json = await res.json();
  const results = json?.resource_response?.data?.results || [];

  const posts = [];
  for (const r of results) {
    if (r.type && r.type !== 'pin') continue; // 스토리/보드 등 비-핀 결과 제외

    const title = (r.grid_title || r.title || '').replace(/\s+/g, ' ').trim();
    if (title.length <= 2 || !isPureKorean(title)) continue; // 100% 한국어 제목만

    const image = pickImage(r);
    if (!image) continue; // 이미지 없는 핀은 제외 (이미지 수집이 목적)

    posts.push({
      id: r.id ? `${SOURCE}:${r.id}` : undefined, // 핀 고유 id로 dedup
      text: title.length > MAX_TEXT_LEN ? title.slice(0, MAX_TEXT_LEN) : title,
      image,                                       // 핀 원본 이미지 URL
      source: SOURCE,
      query: q,                                    // 어떤 검색어에서 나왔는지(진단용)
      timestamp: Date.now(),
      url: r.id ? `https://www.pinterest.com/pin/${r.id}/` : 'https://www.pinterest.com',
    });
  }
  return posts;
}

export async function crawl() {
  const cookie = process.env.PINTEREST_COOKIE || '';
  const queries = await buildQueries();

  // 검색어별 병렬 수집 (하나가 실패해도 나머지는 계속, 로그 미출력)
  const results = await Promise.all(
    queries.map((q) => crawlQuery(q, cookie).catch(() => []))
  );

  return results.flat();
}

export const source = SOURCE;
