// Supabase REST(PostgREST) 서버측 조회 — 공개 읽기(anon 키, RLS 방어)라 서버에서도 anon 사용.
// service role은 크롤러(server.js/src/supabase.js)만 쥔다(architecture.md 원칙).
import { SB_URL, SB_KEY } from '$lib/sb';

type Fetch = typeof globalThis.fetch;

export async function sbGet<T = unknown>(fetch: Fetch, path: string): Promise<T> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}

// meme_cards 원행 → 화면용 카드 (public/app.js mapCard와 동일 모양 유지)
export interface MemeCard {
  id: number;
  name: string;
  tags: string[];
  desc: string;
  cat: string;
  src: string;
  photoUrl: string;
  status: 'new' | 'steady' | 'dead';
  days: number;
  months: number;
  mentions: number;
  commentCount: number;
  voteYes: number;
  voteNo: number;
  voteNotmeme: number;
  died: string | null;
  rank: number | null;
  rankSources: number;
}

export function mapCard(r: Record<string, any>): MemeCard {
  const created = r.created_at ? new Date(r.created_at) : new Date();
  const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
  return {
    id: r.id,
    name: r.name || '',
    tags: r.tags || [],
    desc: r.description || '',
    cat: r.category || '',
    src: r.source || '',
    photoUrl: r.photo_url || '',
    status: r.status || 'new',
    days,
    months: Math.floor(days / 30),
    mentions: r.mentions || 0,
    commentCount: r.comment_count || 0,
    voteYes: r.vote_yes || 0,
    voteNo: r.vote_no || 0,
    voteNotmeme: r.vote_notmeme || 0,
    died: r.died_at || null,
    rank: null,
    rankSources: 0,
  };
}

// 카드 전체 + 측정 순위(score) 병합
export async function loadCards(fetch: Fetch): Promise<MemeCard[]> {
  const rows = await sbGet<Record<string, any>[]>(fetch, 'meme_cards?select=*&order=created_at.desc');
  const cards = rows.map(mapCard);
  try {
    const ranks = await sbGet<{ meme_id: number; avg_rank: string | null; source_count: number; score: string | null }[]>(
      fetch,
      'meme_ranking?select=meme_id,avg_rank,source_count,score'
    );
    const byId = new Map(ranks.map((r) => [String(r.meme_id), r]));
    for (const c of cards) {
      const r = byId.get(String(c.id));
      c.rank = r && r.score != null ? Number(r.score) : null;
      c.rankSources = r ? r.source_count : 0;
    }
  } catch {
    /* 순위 뷰 없으면 순위 없이 진행 */
  }
  return cards;
}

export interface MemeComment {
  id: number;
  nick: string;
  body: string;
  is_user: boolean;
  user_id: string | null;
  created_at: string;
}

export async function loadComments(fetch: Fetch, memeId: number): Promise<MemeComment[]> {
  return sbGet(fetch, `meme_comments?meme_id=eq.${memeId}&select=id,nick,body,is_user,user_id,created_at&order=created_at.desc`);
}
