// 크롤러 ① naver_trend — 데이터랩 검색어 트렌드 (검색량 = 학습 수요)
//
// POST /v1/datalab/search. 한 호출 = 밈 4개 + 기준(anchor) 1개 = 5개 그룹.
// ⚠️ 데이터랩 ratio는 "호출 내 상대값(0~100)"이라 호출 간 비교 불가.
//    그래서 [밈 최신 ratio ÷ 같은 호출 anchor 최신 ratio]로 정규화해 저장 → 호출 간 비교 가능.
//    anchor("밈" 검색량)가 0이면 정규화 불가 → 해당 배치 1회 재시도 후 폐기.
//
// 저장: mention_counts (value=정규화값, day_bucket, source='naver_trend'), 합성키 upsert.

import * as supa from '../supabase.js';
import { naverPost, sleep, sanitizeKeyword, callCount, isConfigured } from './client.js';

const SOURCE = 'naver_trend';
const MEMES_PER_CALL = 4;   // + anchor 1 = 5 그룹(데이터랩 최대)
const MAX_KEYWORDS = 20;    // 그룹당 키워드 상한
const CALL_DELAY_MS = 500;  // 호출 간 딜레이

function ymd(d) { return d.toISOString().slice(0, 10); }

// 밈의 검색 키워드 그룹 만들기(이름 + keywords, 정제·중복제거·상한).
function memeKeywords(m) {
  const raw = [m.name, ...(m.keywords || [])];
  const seen = new Set();
  const out = [];
  for (const k of raw) {
    const s = sanitizeKeyword(k);
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

async function fetchBatch(startDate, endDate, groups) {
  const body = { startDate, endDate, timeUnit: 'date', keywordGroups: groups };
  let res = await naverPost('/v1/datalab/search', body);
  if (res.status === 429) {
    await sleep(2000); // 한도 초과 → 백오프 후 1회 재시도
    res = await naverPost('/v1/datalab/search', body);
  }
  if (!res.ok) { console.error(`[naver_trend] 배치 실패: ${res.status}`); return null; }
  return res.json();
}

// backfill=false: 최신 1일만 기록(매일 크롤). backfill=true: 조회 범위 전체 일자 소급 기록.
//   데이터랩은 한 호출에 기간 전체 시계열을 주므로, 백필도 호출 수는 같고 저장 행만 늘어난다.
//   → 배포 첫날 지난 몇 달치 시계열을 채운 채 시작할 수 있다.
export async function run(memes, { backfill = false } = {}) {
  if (!isConfigured) return; // 키 없으면 조용히 스킵(API 호출 안 함)
  const targets = (memes || [])
    .map((m) => ({ id: m.id, keywords: memeKeywords(m) }))
    .filter((m) => m.keywords.length > 0);
  if (targets.length === 0) { console.error('[naver_trend] 대상 밈 없음'); return; }

  const now = new Date();
  const endDate = ymd(now);
  const daysBack = backfill ? 120 : 30; // 백필은 ~4개월 소급
  const startDate = ymd(new Date(now.getTime() - daysBack * 86400000));
  const nowIso = now.toISOString();
  const anchorGroup = { groupName: '__anchor', keywords: ['밈'] };

  const rows = [];
  let skipped = 0;

  for (let i = 0; i < targets.length; i += MEMES_PER_CALL) {
    const chunk = targets.slice(i, i + MEMES_PER_CALL);
    const groups = chunk.map((m) => ({ groupName: String(m.id), keywords: m.keywords }));
    groups.push(anchorGroup);

    const json = await fetchBatch(startDate, endDate, groups);
    if (!json) { skipped += chunk.length; await sleep(CALL_DELAY_MS); continue; }

    // 정규화는 "같은 날의 anchor"로. period별 anchor ratio를 미리 맵으로.
    const anchorData = (json.results || []).find((r) => r.title === '__anchor')?.data || [];
    const anchorAt = new Map(anchorData.map((d) => [d.period, d.ratio]));

    for (const m of chunk) {
      const data = (json.results || []).find((r) => r.title === String(m.id))?.data || [];
      const points = backfill ? data : data.slice(-1); // 백필=전체, 평상시=최신 1일
      for (const pt of points) {
        const a = anchorAt.get(pt.period);
        if (!a || a === 0) continue; // 그 날 anchor 0이면 정규화 불가 → 스킵
        rows.push({
          meme_id: m.id,
          comment_id: `${SOURCE}:${pt.period}`,
          source: SOURCE,
          hour_bucket: nowIso,
          day_bucket: pt.period,
          value: Math.round((pt.ratio / a) * 1000) / 1000,
        });
      }
    }
    await sleep(CALL_DELAY_MS);
  }

  await supa.upsertMetrics(rows);
  console.log(`[naver_trend] ${backfill ? '백필' : '완료'}: ${rows.length}행 기록, ${skipped}개 배치 스킵. 누적 호출 ${callCount()}`);
}
