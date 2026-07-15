// 정리글 스카우트 — "요즘 밈/신조어 정리" 글에서 사람이 이미 큐레이션해둔 밈 '이름'을 추출 (발굴 2순위).
//
// 예전엔 정리글 링크(url)만 후보로 쌓았지만, 정작 가치는 글 안에 나열된 밈 이름이다.
// → 뉴스·블로그 검색으로 정리글을 낚고, 제목+요약을 LLM(Haiku)에 넣어 밈 term만 뽑는다.
// 반환한 term은 discover-search가 큐에 직행시킨다(사람 보증이라 datalab onset 게이트 우회).
//
// ⚠️ memes 테이블엔 절대 write 안 함. term 후보만 반환. 등록은 운영자 수동.

import { naverGet, sleep, callCount, isConfigured } from './client.js';
import { SCOUT_QUERIES } from './scout-queries.js';

const DISPLAY = 30;
const CALL_DELAY_MS = 150;
const MODEL = 'claude-haiku-4-5-20251001';
const LLM_KEY = process.env.claude_key;
const PER_QUERY = 5; // 쿼리·소스별 상한(전 쿼리가 고루 기여하도록 — 첫 쿼리 독식 방지)
const MAX_ARTICLES = 60; // LLM에 넘길 정리글 전체 상한(비용·노이즈 제어)
const BATCH = 10; // LLM 호출당 기사 수

function clean(t) {
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

// 정리글 수집(제목+요약 스니펫). url 기준 dedup, 상한까지.
async function collectArticles() {
  const arts = [];
  const seen = new Set();
  for (const q of SCOUT_QUERIES) {
    for (const path of ['/v1/search/news.json', '/v1/search/blog.json']) {
      const json = await search(path, q);
      await sleep(CALL_DELAY_MS);
      if (!json) continue;
      let taken = 0;
      for (const it of json.items || []) {
        const title = clean(it.title);
        const desc = clean(it.description);
        const url = it.link || it.originallink;
        if (!title || !url || seen.has(url)) continue;
        seen.add(url);
        arts.push({ title, desc, url });
        if (arts.length >= MAX_ARTICLES) return arts;
        if (++taken >= PER_QUERY) break; // 이 쿼리·소스 몫 소진 → 다음 쿼리로
      }
    }
  }
  return arts;
}

async function askHaiku(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': LLM_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) { console.warn(`[scout] Haiku ${res.status}: ${(await res.text()).slice(0, 160)}`); return []; }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('').trim();
  const json = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { const a = JSON.parse(json); return Array.isArray(a) ? a : []; } catch { return []; }
}

// 정리글 제목+요약에서 밈/신조어 이름만 추출(항목번호로 출처 기사 역참조).
async function extractTerms(articles) {
  if (!LLM_KEY || !articles.length) return [];
  const out = [];
  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH);
    const listing = batch.map((a, idx) => `${idx + 1}. ${a.title} — ${a.desc}`).join('\n');
    const prompt = `아래는 "요즘 유행 밈/신조어 정리" 성격의 글 제목과 요약이다. 여기 언급된 실제 밈·신조어·유행어 '이름'만 뽑아라.
- 사람 이름·상품명·기관명·일반 명사·기사 클리셰("총정리","TOP10","모음")는 제외
- 확실한 것만. 애매하면 넣지 마라. 없으면 [] 만 출력
JSON 배열로만(설명 금지): [{"term":"밈이름","from":항목번호}]

${listing}`;
    const arr = await askHaiku(prompt);
    for (const r of arr) {
      const a = batch[(Number(r.from) || 0) - 1];
      if (r && r.term) out.push({ term: String(r.term).trim(), url: a?.url, title: a?.title });
    }
  }
  return out;
}

// 공급 채널: 정리글에서 추출한 term 후보 목록.
// 반환: [{ term, src:'scout', evidence:{title, url} }] — dedup(등록밈·기각어)은 호출측(discover-search) 담당.
export async function collectRoundupTerms() {
  if (!isConfigured) return [];     // 네이버 키 없으면 스킵
  if (!LLM_KEY) { console.warn('[scout] claude_key 없음 — LLM 추출 스킵'); return []; }
  const arts = await collectArticles();
  const raw = await extractTerms(arts);
  // 문자셋·길이 새니티 + term 단위 dedup(공백·대소문자 무시)
  const best = new Map();
  for (const t of raw) {
    const s = t.term.trim();
    if (!/^[가-힣0-9A-Za-z ]{2,15}$/.test(s)) continue;
    if (!/[가-힣]/.test(s)) continue; // 한글 포함만
    const key = s.replace(/\s+/g, '').toLowerCase();
    if (!best.has(key)) best.set(key, { term: s, src: 'scout', evidence: { title: t.title, url: t.url } });
  }
  console.log(`[scout] 정리글 ${arts.length}개 → term 추출 ${best.size}개 (누적 호출 ${callCount()})`);
  return [...best.values()];
}
