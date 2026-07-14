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

// 결과에서 그룹의 "가장 최근 데이터 포인트"를 뽑는다 → { ratio, period }
function latestPoint(results, title) {
  const r = (results || []).find((x) => x.title === title);
  const data = r?.data || [];
  return data.length ? data[data.length - 1] : null;
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

export async function run(memes) {
  if (!isConfigured) return; // 키 없으면 조용히 스킵(API 호출 안 함)
  const targets = (memes || [])
    .map((m) => ({ id: m.id, keywords: memeKeywords(m) }))
    .filter((m) => m.keywords.length > 0);
  if (targets.length === 0) { console.error('[naver_trend] 대상 밈 없음'); return; }

  const now = new Date();
  const endDate = ymd(now);
  const startDate = ymd(new Date(now.getTime() - 30 * 86400000));
  const nowIso = now.toISOString();
  const anchorGroup = { groupName: '__anchor', keywords: ['밈'] };

  const rows = [];
  let skipped = 0;

  for (let i = 0; i < targets.length; i += MEMES_PER_CALL) {
    const chunk = targets.slice(i, i + MEMES_PER_CALL);
    const groups = chunk.map((m) => ({ groupName: String(m.id), keywords: m.keywords }));
    groups.push(anchorGroup);

    let json = await fetchBatch(startDate, endDate, groups);
    let anchor = json && latestPoint(json.results, '__anchor');
    if (json && (!anchor || anchor.ratio === 0)) {
      await sleep(CALL_DELAY_MS);
      json = await fetchBatch(startDate, endDate, groups); // anchor 0 → 1회 재시도
      anchor = json && latestPoint(json.results, '__anchor');
    }
    if (!json || !anchor || anchor.ratio === 0) { skipped += chunk.length; await sleep(CALL_DELAY_MS); continue; }

    for (const m of chunk) {
      const pt = latestPoint(json.results, String(m.id));
      if (!pt) continue;
      const value = Math.round((pt.ratio / anchor.ratio) * 1000) / 1000; // 정규화값
      const day = pt.period; // YYYY-MM-DD
      rows.push({
        meme_id: m.id,
        comment_id: `${SOURCE}:${day}`,
        source: SOURCE,
        hour_bucket: nowIso,
        day_bucket: day,
        value,
      });
    }
    await sleep(CALL_DELAY_MS);
  }

  await supa.upsertMetrics(rows);
  console.log(`[naver_trend] 완료: ${rows.length}개 밈 값 기록, ${skipped}개 스킵(anchor 0/실패). 누적 호출 ${callCount()}`);
}
