// 짤 보관소 검색 — 하이브리드(docs/jjal-archive-plan.md 5장):
// ⓪ keywords 정확 일치(최상단 고정) → ① caption 부분 일치 → ② 벡터 유사도(의미 확장).
// 질의 임베딩은 HF 추론 API(multilingual-e5-large)로 만들고 jjal_queries에 캐시한다.
import { sbGet } from '$lib/server/db';
import { expandQuery } from '$lib/server/jjalAlias';
import { SB_URL, SB_KEY } from '$lib/sb';
import { env } from '$env/dynamic/private';

type Fetch = typeof globalThis.fetch;

export type Jjal = {
  id: number;
  image_url: string;
  thumb_url: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  keywords: string[] | null;
  source_url: string | null;
  meme_id: number | null;
};

const COLS = 'id,image_url,thumb_url,width,height,caption,keywords,source_url,meme_id';
export const QUERY_MAX = 50; // 어뷰징 방어: 질의 길이 상한(설계서 4장)

const EMBED_MODEL = 'intfloat/multilingual-e5-large';
const EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBED_MODEL}/pipeline/feature-extraction`;
// e5 코사인 거리 컷 — 이보다 멀면 "없으면 안 보여준다" 원칙대로 버린다.
// 2026-07-21 실측: 관련 짤 0.14~0.18, 무관("비"→"비눗방울") 0.199부터 → 0.19로 확정
const DIST_MAX = 0.19;

async function rpc<T>(fetch: Fetch, fn: string, args: object): Promise<T | null> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) return null;
  return r.json();
}

// 질의 임베딩 — jjal_queries 캐시 우선, 미스면 HF 호출 후 저장.
// e5는 질의에 "query: " 접두사가 필수(scripts/embed_jjals.py의 "passage: "와 쌍).
async function embedQuery(fetch: Fetch, q: string): Promise<string | null> {
  const cached = await rpc<string>(fetch, 'jjal_query_get', { q });
  if (cached) return cached;
  if (!env.HF_TOKEN) return null; // 키 없으면 벡터 검색만 조용히 생략
  try {
    const r = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.HF_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ inputs: ['query: ' + q] }),
    });
    if (!r.ok) return null;
    const v = (await r.json())[0];
    return Array.isArray(v) ? JSON.stringify(v) : null;
  } catch {
    return null;
  }
}

export async function searchJjals(fetch: Fetch, raw: string): Promise<Jjal[]> {
  const q = raw.trim().slice(0, QUERY_MAX);
  if (!q) return [];
  const seen = new Set<number>();
  const out: Jjal[] = [];

  // 별칭 확장 — 'GD'로는 0건이지만 '지드래곤'으로는 나온다(docs/jjal-alias-plan.md).
  // 확장어마다 순차로 왕복하면 응답이 확장어 수에 비례해 늘어난다(실측: 1개 0.19s → 4개 0.62s).
  // 서로 의존이 없으므로 전부 동시에 던지고, 합칠 때만 순서를 지킨다.
  const terms = expandQuery(q);
  const pairs = await Promise.all(
    terms.map(async (term) => {
      const enc = encodeURIComponent(term);
      return Promise.all([
        // ① keywords 배열 정확 일치 — 벡터 점수와 무관하게 최상단 고정이 원칙
        sbGet<Jjal[]>(fetch, `jjals?select=${COLS}&status=eq.live&keywords=cs.{"${enc}"}&limit=120`),
        // ①' caption 부분 일치 — 정확 일치가 못 잡는 표현을 받친다.
        // 한 글자엔 쓰지 않는다: "비"가 "미모의 비결"의 '비'에도 걸려 결과가 온통 노이즈가 된다
        term.length >= 2
          ? sbGet<Jjal[]>(fetch, `jjals?select=${COLS}&status=eq.live&caption=ilike.*${enc}*&limit=120`)
          : Promise.resolve([] as Jjal[]),
      ]);
    })
  );
  // 합치는 순서가 곧 노출 순서다 — 원본 질의(terms[0])의 정확 일치가 항상 맨 위에 온다
  for (const [exact, like] of pairs) {
    for (const j of [...exact, ...like]) if (!seen.has(j.id)) { seen.add(j.id); out.push(j); }
  }

  // ② 벡터 유사도 — 의미 확장(비 → 장마·우산). 거리 컷 밖은 버린다(없으면 안 보여준다 원칙)
  const vec = await embedQuery(fetch, q);
  if (vec) {
    const near = (await rpc<(Jjal & { distance: number })[]>(fetch, 'match_jjals', { qvec: vec, n: 120 })) || [];
    const close = near.filter((j) => j.distance <= DIST_MAX);
    for (const j of close) if (!seen.has(j.id)) { seen.add(j.id); out.push(j); }
    // 검색 로그 + 질의 캐시 저장(캐시 히트였으면 put은 결과 수만 갱신)
    rpc(fetch, 'jjal_query_put', { q, v: vec, model: EMBED_MODEL, rc: out.length }).catch(() => {});
  }
  return out;
}

// 상세 페이지 — 색인 대상이므로 없으면 404를 내야 한다(soft 404 금지)
export async function getJjal(fetch: Fetch, id: number): Promise<Jjal | null> {
  const rows = await sbGet<Jjal[]>(fetch, `jjals?select=${COLS}&status=eq.live&id=eq.${id}&limit=1`);
  return rows[0] ?? null;
}

// 상세 페이지 하단 관련 짤 — 키워드가 하나라도 겹치는 것.
// 내부 링크가 곧 크롤 경로다(그리드에서 못 닿는 짤을 여기서 잇는다).
export async function relatedJjals(fetch: Fetch, j: Jjal, limit = 12): Promise<Jjal[]> {
  const kws = (j.keywords || []).slice(0, 6);
  if (!kws.length) return [];
  const ov = kws.map((k) => `"${encodeURIComponent(k)}"`).join(',');
  const rows = await sbGet<Jjal[]>(
    fetch,
    `jjals?select=${COLS}&status=eq.live&keywords=ov.{${ov}}&id=neq.${j.id}&limit=${limit}`
  );
  return rows;
}

// 첫 진입 그리드 — 최신 등록순 한 묶음
export async function recentJjals(fetch: Fetch, limit = 60): Promise<Jjal[]> {
  return sbGet<Jjal[]>(
    fetch,
    `jjals?select=${COLS}&status=eq.live&order=id.desc&limit=${limit}`
  );
}
