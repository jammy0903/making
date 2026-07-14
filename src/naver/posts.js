// 크롤러 ② naver_posts — 블로그·카페 검색 (새 글 수 = 사용량)
//
// GET /v1/search/blog.json, /v1/search/cafearticle.json (sort=date). 밈별 대표 키워드 1개.
//  - 블로그: postdate 필드로 "최근 7일 내 글 수" 집계 → value
//  - 카페: 응답에 날짜 필드가 있으면 동일하게 7일 집계, 없으면 total 스냅샷을 value로 저장
//          (전일 대비 증분은 일자별 스냅샷에서 다운스트림 계산). 필드 유무는 런타임 확인.
//  - 검색 0건은 정상(value=0으로 기록). 요청 에러(res.ok=false)는 스킵(에러≠0 구분).
//
// 저장: mention_counts (value, day_bucket, source='naver_blog' / 'naver_cafe'), 합성키 upsert.

import * as supa from '../supabase.js';
import { naverGet, sleep, sanitizeKeyword, callCount, isConfigured } from './client.js';

const DISPLAY = 100;
const RECENT_DAYS = 7;
const CALL_DELAY_MS = 150;

function ymd(d) { return d.toISOString().slice(0, 10); }
function yyyymmdd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ''); }

// 밈 대표 질의어: keywords[0] 우선(정제), 비면 name.
function primaryQuery(m) {
  const first = sanitizeKeyword((m.keywords || [])[0]);
  return first || sanitizeKeyword(m.name);
}

// 아이템 배열에서 날짜 필드(postdate 등)를 찾아 "최근 N일" 개수를 센다. 날짜 필드 없으면 null.
function countRecent(items, sinceYmd) {
  const sample = items[0] || {};
  const field = ['postdate', 'pubDate', 'pDate'].find((f) => sample[f] != null);
  if (!field) return null; // 날짜 필드 없음
  let n = 0;
  for (const it of items) {
    const raw = String(it[field] || '').replace(/\D/g, '').slice(0, 8);
    if (raw && raw >= sinceYmd) n++;
  }
  return n;
}

async function search(path, query) {
  let res = await naverGet(path, { query, display: DISPLAY, sort: 'date' });
  if (res.status === 429) { await sleep(2000); res = await naverGet(path, { query, display: DISPLAY, sort: 'date' }); }
  if (!res.ok) return null; // 에러 → 스킵(0과 구분)
  return res.json();
}

export async function run(memes) {
  if (!isConfigured) return; // 키 없으면 조용히 스킵
  const now = new Date();
  const day = ymd(now);
  const nowIso = now.toISOString();
  const sinceYmd = yyyymmdd(new Date(now.getTime() - RECENT_DAYS * 86400000));

  const rows = [];
  let errors = 0;

  for (const m of memes || []) {
    const q = primaryQuery(m);
    if (!q) continue;

    // 블로그: 최근 7일 글 수
    const blog = await search('/v1/search/blog.json', q);
    if (blog) {
      const items = blog.items || [];
      const recent = countRecent(items, sinceYmd);
      const value = recent == null ? items.length : recent; // 날짜필드 없으면(이례적) 페이지 건수
      rows.push({ meme_id: m.id, comment_id: `naver_blog:${day}`, source: 'naver_blog', hour_bucket: nowIso, day_bucket: day, value });
    } else errors++;
    await sleep(CALL_DELAY_MS);

    // 카페: 날짜 필드 있으면 7일 집계, 없으면 total 스냅샷
    const cafe = await search('/v1/search/cafearticle.json', q);
    if (cafe) {
      const items = cafe.items || [];
      const recent = countRecent(items, sinceYmd);
      const value = recent == null ? (cafe.total || 0) : recent; // 날짜필드 없음 → 전체 건수 스냅샷
      rows.push({ meme_id: m.id, comment_id: `naver_cafe:${day}`, source: 'naver_cafe', hour_bucket: nowIso, day_bucket: day, value });
    } else errors++;
    await sleep(CALL_DELAY_MS);
  }

  await supa.upsertMetrics(rows);
  console.log(`[naver_posts] 완료: ${rows.length}행 기록(blog/cafe), ${errors}건 요청 에러. 누적 호출 ${callCount()}`);
}
