// Supabase REST(PostgREST) 서버측 조회 — 공개 읽기(anon 키, RLS 방어)라 서버에서도 anon 사용.
// service role은 크롤러(server.js/src/supabase.js)만 쥔다(architecture.md 원칙).
import { SB_URL, SB_KEY } from '$lib/sb';
import { getLocale } from '$lib/paraglide/runtime';

type Fetch = typeof globalThis.fetch;

// 요청 locale이 en인지(요청 컨텍스트 밖이면 false로 안전 처리)
export function isEnLocale(): boolean {
  try { return getLocale() === 'en'; } catch { return false; }
}

// 한국 IP 판별 — hooks.server.ts의 언어 리다이렉트 신호(x-vercel-ip-country → accept-language)와
// 동일 기준을 재사용해, 신호가 없을 때만 한국으로 기본 처리한다(사이트 전역에서 판정 일관성 유지).
export function isKoreanRequest(request: Request): boolean {
  const country = request.headers.get('x-vercel-ip-country');
  if (country) return country === 'KR';
  const acceptLang = request.headers.get('accept-language') || '';
  if (acceptLang) return /(^|,|\s)ko(-|;|,|$)/i.test(acceptLang);
  return true;
}

export async function sbGet<T = unknown>(fetch: Fetch, path: string): Promise<T> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}

// PostgREST db-max-rows 상한. 넘는 만큼은 에러 없이 조용히 잘려 나가므로 반드시 페이징해야 한다.
const PAGE = 1000;

async function sbGetPage<T>(fetch: Fetch, path: string, from: number): Promise<T[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Range: `${from}-${from + PAGE - 1}`,
    },
  });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return (await r.json()) as T[];
}

// 상한을 넘는 테이블 전체 조회 — 꽉 찬 페이지가 나오는 동안 계속 이어 받는다.
// 총량을 미리 알면 나머지 페이지를 병렬로 받을 수 있지만, Prefer: count=exact가
// meme_cards 뷰(4중 집계 조인)를 세느라 전체를 구체화해 되레 2배 느렸다(실측 1995ms vs 1053ms).
// ⚠️ path의 order에는 반드시 유일 tiebreaker(id)가 들어가야 한다 — memes.created_at은
//    대량삽입 탓에 1000행에 distinct 16개뿐이라, 동점 정렬은 페이지 간 중복·누락을 만든다.
export async function sbGetAll<T = unknown>(fetch: Fetch, path: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = await sbGetPage<T>(fetch, path, from);
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

// meme_cards 원행 → 화면용 카드 (public/app.js mapCard와 동일 모양 유지)
export interface MediaItem {
  type: 'image' | 'video';
  url: string;
}
export interface MemeCard {
  id: number;
  name: string;
  tags: string[];
  desc: string;
  cat: string;
  src: string;
  photoUrl: string;
  videoUrl: string;
  media: MediaItem[];
  status: 'new' | 'steady' | 'dead';
  origin: 'kr' | 'us'; // 근본 나라 (한국/미국)
  photoUpdatedAt: string | null;
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
  const en = isEnLocale(); // en이면 번역 필드 우선(없으면 한국어 폴백)
  return {
    id: r.id,
    name: (en && r.name_en) || r.name || '',
    tags: (en && r.tags_en && r.tags_en.length ? r.tags_en : r.tags) || [],
    desc: (en && r.description_en) || r.description || '',
    cat: r.category || '',
    src: r.source || '',
    photoUrl: r.photo_url || '',
    videoUrl: r.video_url || '',
    media: Array.isArray(r.media) ? r.media.filter((x: any) => x && x.url) : [],
    status: r.status || 'new',
    origin: (r.tags || []).includes('#미국') ? 'us' : 'kr', // 근본 나라 — 원본 태그 기준(locale 무관)
    photoUpdatedAt: r.photo_updated_at || null,
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

// 목록용 컬럼만 — select=*는 홈에서 안 쓰는 last_activity·source까지 실어 페이로드를 키운다.
// source는 상세(/m/[id])에서만 쓰므로 목록에서 뺀다.
const LIST_COLS =
  'id,name,description,tags,category,status,photo_url,video_url,media,created_at,photo_updated_at,died_at,mentions,comment_count,vote_yes,vote_no,vote_notmeme';
const LIST_COLS_EN = `${LIST_COLS},name_en,tags_en,description_en`; // ko 요청엔 안 보냄(132KB)

// 카드 전체 + 측정 순위(score) 병합
export async function loadCards(fetch: Fetch): Promise<MemeCard[]> {
  const cols = isEnLocale() ? LIST_COLS_EN : LIST_COLS;
  // 두 조회는 서로 의존이 없다 — 순차로 돌리면 왕복이 그대로 더해진다.
  const [rows, ranks] = await Promise.all([
    sbGetAll<Record<string, any>>(fetch, `meme_cards?select=${cols}&order=created_at.desc,id.desc`),
    sbGetAll<{ meme_id: number; avg_rank: string | null; source_count: number; score: string | null }>(
      fetch,
      'meme_ranking?select=meme_id,avg_rank,source_count,score&order=meme_id.asc'
    ).catch(() => []), // 순위 뷰 없으면 순위 없이 진행
  ]);
  const cards = rows.map(mapCard);
  const byId = new Map(ranks.map((r) => [String(r.meme_id), r]));
  for (const c of cards) {
    const r = byId.get(String(c.id));
    c.rank = r && r.score != null ? Number(r.score) : null;
    c.rankSources = r ? r.source_count : 0;
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
