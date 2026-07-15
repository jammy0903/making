// 네이버 검색광고 keywordstool — term의 절대 월간검색수 조회 (설계: search-demand-design.md §3-B).
//
// ⚠️ 발굴용이 아니다(2026-07-16 실측): keywordstool은 광고주용 상업 키워드 도구라
// 신조어("알빠노"·"테무깡")엔 연관키워드가 자기 자신뿐이고, 확장하면 프랜차이즈 상업어만 나온다.
// 살릴 가치는 하나 — 아무 term이나 넣으면 그 **절대 월간검색량**을 준다(데이터랩은 상대 ratio만 줌).
// 그래서 이 모듈은 다른 채널(구글트렌드·스카우트)이 올린 후보의 절대량을 **보강**하는 데만 쓴다.
// 주의: 갓 태어난 신조어는 과소 집계됨(알빠노=20) → evidence·랭킹 참고용이지 하드 필터 아님.
//
// 인증: X-Signature = base64(HMAC-SHA256(`${timestamp}.${method}.${path}`, SECRET))
// 키는 환경변수로만(하드코딩 금지). 두 표기 모두 인식(정식 이름 / 사용자가 .env에 쓴 이름).

import crypto from 'node:crypto';

const API_KEY = process.env.NAVER_AD_API_KEY || process.env.accesslicensekey_naver;
const SECRET = process.env.NAVER_AD_SECRET || process.env.secret_naver;
const CUSTOMER = process.env.NAVER_AD_CUSTOMER_ID || process.env.customerid;

export const isConfigured = Boolean(API_KEY && SECRET && CUSTOMER);

const BASE = 'https://api.searchad.naver.com';

function headers(method, path) {
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', SECRET).update(`${ts}.${method}.${path}`).digest('base64');
  return {
    'X-Timestamp': ts,
    'X-API-KEY': API_KEY,
    'X-Customer': String(CUSTOMER),
    'X-Signature': sig,
    'Content-Type': 'application/json',
  };
}

// "< 10" 같은 문자열 카운트를 숫자로
const num = (v) => (typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0);

// 시드(최대 5개, 공백 불가 — 자동 제거)의 연관키워드 조회.
// 반환: [{ term, monthly }] — monthly = PC+모바일 월간검색수 합
export async function fetchRelatedKeywords(seeds) {
  const path = '/keywordstool';
  const hint = seeds.map((s) => s.replace(/\s+/g, '')).filter(Boolean).slice(0, 5).join(',');
  const url = `${BASE}${path}?hintKeywords=${encodeURIComponent(hint)}&showDetail=1`;
  const res = await fetch(url, { headers: headers('GET', path), signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`keywordstool ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.keywordList || []).map((k) => ({
    term: k.relKeyword,
    monthly: num(k.monthlyPcQcCnt) + num(k.monthlyMobileQcCnt),
  }));
}

const normKey = (s) => s.replace(/\s+/g, '').toLowerCase(); // keywordstool은 공백 제거·영문 대문자화

// 후보 term들의 절대 월간검색량 조회. keywordstool은 hintKeywords에 넣은 term 자신의
// 볼륨을 항상 에코하므로(공백 5개 한도), 이를 배치로 회수한다.
// 반환: Map(원본term → monthly). 조회 실패/미회수 term은 Map에 없음(null 취급).
export async function fetchVolumes(terms) {
  const uniq = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
  const out = new Map();
  for (let i = 0; i < uniq.length; i += 5) {
    const batch = uniq.slice(i, i + 5);
    let rows;
    try {
      rows = await fetchRelatedKeywords(batch);
    } catch {
      continue; // 한 배치 실패는 격리 — 나머지 term은 계속 조회
    }
    const vol = new Map(rows.map((r) => [normKey(r.term), r.monthly]));
    for (const t of batch) {
      const v = vol.get(normKey(t));
      if (v != null) out.set(t, v);
    }
  }
  return out;
}
