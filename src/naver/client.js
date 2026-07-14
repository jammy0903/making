// 네이버 오픈 API 공통 클라이언트 — 공식·무료·안정. 페이지 HTML 스크래핑 금지, API만 사용.
//
// 키는 환경변수로만 주입(하드코딩 금지). 둘 다 없으면 isConfigured=false → 크롤러가 스킵.
//   NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (developers.naver.com 앱 등록: 검색 API + 데이터랩)

// 변수명 두 형태 모두 인식 (NAVER_CLIENT_ID/SECRET 또는 NAVER_CLIENTID/NAVER_SECRET)
const ID = process.env.NAVER_CLIENT_ID || process.env.NAVER_CLIENTID;
const SECRET = process.env.NAVER_CLIENT_SECRET || process.env.NAVER_SECRET;

export const isConfigured = Boolean(ID && SECRET);

// 일일 호출 수 집계(25,000 한도 대비 사용률 로깅용). runNaver 시작 시 reset.
let calls = 0;
export function callCount() { return calls; }
export function resetCalls() { calls = 0; }

function headers(extra = {}) {
  return { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET, ...extra };
}

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// GET 검색 API. res를 그대로 반환(호출측이 res.ok / 429 백오프 판단).
export async function naverGet(path, params) {
  calls++;
  const qs = new URLSearchParams(params).toString();
  return fetch(`https://openapi.naver.com${path}?${qs}`, { headers: headers() });
}

// POST (데이터랩).
export async function naverPost(path, body) {
  calls++;
  return fetch(`https://openapi.naver.com${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
}

// 데이터랩/검색 키워드 정제: 이모지·특수문자 제거, 한글·영숫자·공백만. 2글자 미만은 버림.
export function sanitizeKeyword(kw) {
  const s = (kw || '')
    .replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length >= 2 ? s : '';
}
