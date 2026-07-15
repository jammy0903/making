// 네이버 데이터랩 검색어트렌드 — 후보 X의 검색 수요를 「X」와 「X 뜻」 동시 조회로 검증.
// 설계: docs/search-demand-design.md §4.
//
// 핵심:
//  - ratio는 "요청 내 최대=100"인 상대값이라 호출 간 비교 불가 → 매 호출에 앵커 그룹을
//    고정으로 넣고 앵커 평균 대비 비율로 환산(앵커 정규화).
//  - "X 뜻" 급증 = 뜻을 찾는 사람이 생겼다 = 밈/신조어의 직접 신호. 뉴스·인물은
//    "뜻"으로 검색되지 않아 오탐 필터를 겸한다.

import { naverPost, isConfigured } from './client.js';

export { isConfigured };

const ANCHOR = '날씨';      // 검색량이 크고 안정적인 기준 키워드
const WINDOW_D = 60;        // 조회 기간(일)
const RECENT_D = 7;         // "최근" 창
const BASE_D = 28;          // 배경 창 (최근 직전 4주)

// ── 판정 임계(드라이런으로 튜닝) ──
const SURGE_RATIO = 3;      // 최근7일 평균 ≥ 배경 평균 × 3
const RISE_X = 1.5;         // X 자체도 상승 (최근 ≥ 배경 × 1.5)

const fmt = (d) => d.toISOString().slice(0, 10);

// 후보 최대 2개를 앵커와 함께 1회 호출 (5그룹 한도: 앵커1 + 후보2×2)
// 반환: Map<term, {x: number[], tteut: number[]}> — 앵커 정규화된 일별 시계열(0 채움)
export async function fetchPairSeries(terms) {
  if (terms.length === 0 || terms.length > 2) throw new Error('후보는 1~2개씩');
  const end = new Date(Date.now() - 86400_000); // 당일은 집계 미완 → 어제까지
  const start = new Date(end.getTime() - WINDOW_D * 86400_000);

  const groups = [{ groupName: '__anchor', keywords: [ANCHOR] }];
  for (const t of terms) {
    groups.push({ groupName: `x:${t}`, keywords: [t] });
    groups.push({ groupName: `t:${t}`, keywords: [`${t} 뜻`] });
  }
  const res = await naverPost('/v1/datalab/search', {
    startDate: fmt(start),
    endDate: fmt(end),
    timeUnit: 'date',
    keywordGroups: groups,
  });
  if (!res.ok) throw new Error(`datalab ${res.status}: ${await res.text()}`);
  const data = await res.json();

  // 날짜축 통일: start~end 일별로 0 채움
  const days = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86400_000) days.push(fmt(new Date(t)));
  const seriesOf = (groupName) => {
    const g = (data.results || []).find((r) => r.title === groupName);
    const byDate = new Map((g?.data || []).map((p) => [p.period, p.ratio]));
    return days.map((d) => byDate.get(d) || 0);
  };

  const anchor = seriesOf('__anchor');
  const anchorMean = anchor.reduce((a, b) => a + b, 0) / anchor.length || 1;
  const norm = (arr) => arr.map((v) => v / anchorMean);

  const out = new Map();
  for (const t of terms) out.set(t, { x: norm(seriesOf(`x:${t}`)), tteut: norm(seriesOf(`t:${t}`)) });
  return out;
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

// 시계열 → 판정. 반환: { pass, transition, surge, xRising, recentT, baseT, recentX, baseX }
export function judge({ x, tteut }) {
  const recentT = avg(tteut.slice(-RECENT_D));
  const baseT = avg(tteut.slice(-(RECENT_D + BASE_D), -RECENT_D));
  const recentX = avg(x.slice(-RECENT_D));
  const baseX = avg(x.slice(-(RECENT_D + BASE_D), -RECENT_D));

  const transition = baseT === 0 && recentT > 0;          // "X 뜻" 0 → 양수 전환
  const surge = baseT > 0 && recentT / baseT >= SURGE_RATIO; // 또는 급증
  const xRising = baseX === 0 ? recentX > 0 : recentX / baseX >= RISE_X; // X 자체도 상승

  return { pass: (transition || surge) && xRising, transition, surge, xRising, recentT, baseT, recentX, baseX };
}
