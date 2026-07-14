// 크롤러 ③ meme_scout — 신상 밈 후보 발굴 감시 (발굴 1단)
//
// 뉴스·블로그 검색으로 "밈 정리/모음" 글을 낚아 discovery_candidates에 후보로 쌓는다.
// ⚠️ memes 테이블에는 절대 write 하지 않는다. 후보 큐에만 넣는다.
//    등록은 운영자가 검토 후 수동 (기계는 등록 안 함, 후보 제안만).
//    url UNIQUE로 중복 자동 무시. 이미 등록된 밈 이름이 제목에 있으면 스킵.

import * as supa from '../supabase.js';
import { naverGet, sleep, callCount, isConfigured } from './client.js';
import { SCOUT_QUERIES } from './scout-queries.js';

const DISPLAY = 30;
const CALL_DELAY_MS = 150;

function cleanTitle(t) {
  return String(t || '')
    .replace(/<\/?b>/g, '')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#3[49];/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function search(path, query) {
  let res = await naverGet(path, { query, display: DISPLAY, sort: 'date' });
  if (res.status === 429) { await sleep(2000); res = await naverGet(path, { query, display: DISPLAY, sort: 'date' }); }
  if (!res.ok) return null;
  return res.json();
}

export async function run(memes) {
  if (!isConfigured) return; // 키 없으면 조용히 스킵
  const names = (memes || []).map((m) => (m.name || '').trim()).filter((n) => n.length >= 2);
  const rows = [];
  const seen = new Set();

  for (const q of SCOUT_QUERIES) {
    for (const [path, type] of [
      ['/v1/search/news.json', 'naver_news'],
      ['/v1/search/blog.json', 'naver_blog'],
    ]) {
      const json = await search(path, q);
      await sleep(CALL_DELAY_MS);
      if (!json) continue;
      for (const it of json.items || []) {
        const title = cleanTitle(it.title);
        const url = it.link || it.originallink;
        if (!title || !url || seen.has(url)) continue;
        if (names.some((n) => title.includes(n))) continue; // 이미 등록된 밈은 후보 제외
        seen.add(url);
        rows.push({ title: title.slice(0, 300), url, source_type: type });
      }
    }
  }

  const inserted = await supa.insertCandidates(rows);
  console.log(`[meme_scout] 후보 ${rows.length}건 수집 → 신규 ${inserted.length}건 저장(중복 제외). 누적 호출 ${callCount()}`);
}
