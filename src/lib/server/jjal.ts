// 짤 보관소 검색 — Phase 2 최소 구현: 키워드 정확 일치 + 캡션 부분 일치(하이브리드 ⓪단계).
// 벡터 검색(임베딩)은 embedding 채운 뒤 이 파일에 추가한다(docs/jjal-archive-plan.md 5장).
import { sbGet } from '$lib/server/db';

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

export async function searchJjals(fetch: Fetch, raw: string): Promise<Jjal[]> {
  const q = raw.trim().slice(0, QUERY_MAX);
  if (!q) return [];
  const enc = encodeURIComponent(q);
  // ① keywords 배열 정확 일치 — 벡터 점수와 무관하게 최상단 고정이 원칙
  const exact = await sbGet<Jjal[]>(
    fetch,
    `jjals?select=${COLS}&status=eq.live&keywords=cs.{"${enc}"}&limit=120`
  );
  // ② caption·keywords 부분 일치 — 정확 일치가 못 잡는 표현을 받친다
  const like = await sbGet<Jjal[]>(
    fetch,
    `jjals?select=${COLS}&status=eq.live&or=(caption.ilike.*${enc}*,keywords.cs.{"${enc}"})&limit=120`
  );
  const seen = new Set(exact.map((j) => j.id));
  return [...exact, ...like.filter((j) => !seen.has(j.id))];
}

// 첫 진입 그리드 — 최신 등록순 한 묶음
export async function recentJjals(fetch: Fetch, limit = 60): Promise<Jjal[]> {
  return sbGet<Jjal[]>(
    fetch,
    `jjals?select=${COLS}&status=eq.live&order=id.desc&limit=${limit}`
  );
}
