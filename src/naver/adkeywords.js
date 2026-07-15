// 네이버 검색광고 keywordstool — 시드의 연관키워드 + 절대 월간검색수 (발굴 공급 채널 B).
// 설계: docs/search-demand-design.md §3-B. 데이터랩(상대값)의 약점을 절대량으로 보완.
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

// 발굴용 후보 추출: 시드 연관키워드 중 ①한글 위주 ②"~뜻"으로 끝나는 것은 접미사 제거
// ("알빠노뜻"을 검색한다 = 뜻 수요가 실존한다는 가장 강한 신호) ③검색량 하한 필터.
export async function fetchMemeCandidates({ seeds = ['밈', '신조어', '유행어'], minMonthly = 300, top = 30 } = {}) {
  const rows = await fetchRelatedKeywords(seeds);
  const out = [];
  for (const { term, monthly } of rows) {
    if (monthly < minMonthly) continue;
    let t = term.trim();
    let tteut = false;
    if (t.endsWith('뜻')) { t = t.slice(0, -1).trim(); tteut = true; } // "X뜻" → X (+강신호)
    if (!/^[가-힣0-9A-Za-z ]{2,12}$/.test(t)) continue;
    if (!/[가-힣]/.test(t)) continue; // 한글 포함만
    out.push({ term: t, monthly, tteutQuery: tteut });
  }
  // 중복(뜻 유무만 다른 경우)은 tteutQuery=true 우선으로 합침
  const best = new Map();
  for (const c of out) {
    const prev = best.get(c.term);
    if (!prev || (c.tteutQuery && !prev.tteutQuery) || c.monthly > prev.monthly) best.set(c.term, { ...prev, ...c });
  }
  return [...best.values()].sort((a, b) => (b.tteutQuery - a.tteutQuery) || (b.monthly - a.monthly)).slice(0, top);
}
