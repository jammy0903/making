// 방문자 쓰기(투표·댓글) — 브라우저에서 Supabase REST 직결(anon + RLS). public/app.js 이식.
import { SB_URL, SB_KEY } from '$lib/sb';
import { headers } from '$lib/client/auth';
import type { MediaItem } from '$lib/server/db';

const SB = { url: SB_URL, key: SB_KEY };

async function sbPost(path: string, body: unknown, prefer = 'return=representation') {
  const r = await fetch(`${SB.url}/rest/v1/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json', Prefer: prefer }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} ${r.status}: ${await r.text()}`);
  return prefer.includes('representation') ? r.json() : null;
}

async function sbWrite(method: 'PATCH' | 'DELETE', path: string, body?: unknown) {
  const r = await fetch(`${SB.url}/rest/v1/${path}`, {
    method,
    headers: headers(body ? { 'Content-Type': 'application/json', Prefer: 'return=minimal' } : { Prefer: 'return=minimal' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path} ${r.status}: ${await r.text()}`);
}

// ── 투표 (월 1회 재판정 — localStorage {c,t} + DB month_bucket PK와 동일 기준) ──
export function voterId() {
  let v = localStorage.getItem('meme-voter');
  if (!v) {
    v = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('meme-voter', v);
  }
  return v;
}
// 밈이다 / 밈이 아니다. 예전엔 'no'(죽은 밈이다)가 있었으나 사망 개념을 걷어내며 없앴다
// — 밈이 언제 것인지는 전성기 연도(era_year)가 말해준다.
export type VoteChoice = 'yes' | 'notmeme';
type VotedEntry = { c: VoteChoice; t: number };
export function votedMap(): Record<string, VotedEntry> {
  try {
    return JSON.parse(localStorage.getItem('meme-voted') || '{}');
  } catch {
    return {};
  }
}
export function sameMonth(t: number) {
  const d = new Date(t), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}
export function markVoted(id: number | string, choice: VoteChoice) {
  const m = votedMap();
  m[String(id)] = { c: choice, t: Date.now() };
  localStorage.setItem('meme-voted', JSON.stringify(m));
}
export async function castVote(memeId: number, choice: VoteChoice) {
  await sbPost('meme_votes', { meme_id: memeId, voter_id: voterId(), choice }, 'return=minimal');
}

// ── 인지도(안다/모른다) — 수집만 하고 표시 안 함(% 잠금, 표본 쌓이면 공개) ──
// upsert(ON CONFLICT) 금지: 충돌 행을 읽어야 해서 select 정책 없는 이 테이블에선 RLS에 막힌다.
// 평범한 insert 후 중복은 409로 받는다(= 이미 기록됨, castVote의 월중복 처리와 동일 관례).
export async function castAwareness(memeId: number, knows: boolean) {
  try {
    await sbPost('meme_awareness', { meme_id: memeId, voter_id: voterId(), knows }, 'return=minimal');
  } catch (e) {
    if (!String(e).includes(' 409')) throw e; // 중복만 무시, 그 외 실패는 호출측에 노출
  }
}

// ── 연도 맞히기(상세 페이지 판정) ──
// awareness와 동일 관례: 브라우저당 밈 1회, 중복은 409로 오고 무시한다(정답은 이미 화면에 떴다).
export async function castEraGuess(memeId: number, guessYear: number) {
  try {
    await sbPost('era_guesses', { meme_id: memeId, voter_id: voterId(), guess_year: guessYear }, 'return=minimal');
  } catch (e) {
    if (!String(e).includes(' 409')) throw e;
  }
}

// 맞힌 연도 로컬 기억 — 재방문 시 정답을 다시 감추지 않으려고(서버는 개별 추측을 안 내준다)
const GUESS_KEY = 'mmd-era-guess';
export function guessedMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(GUESS_KEY) || '{}');
  } catch {
    return {};
  }
}
export function markGuessed(memeId: number | string, guessYear: number) {
  const m = guessedMap();
  m[String(memeId)] = guessYear;
  localStorage.setItem(GUESS_KEY, JSON.stringify(m));
}

// ── 세대 판독 결과 + 실제 나이대 자기보고(정확도 측정용) ──
export type AgeBand = '~19' | '20-24' | '25-29' | '30-39' | '40+';
export async function castReading(mentalYear: number, knownCount: number, totalCount: number, ageBand: AgeBand) {
  await sbPost(
    'era_readings',
    { voter_id: voterId(), mental_year: mentalYear, known_count: knownCount, total_count: totalCount, age_band: ageBand },
    'return=minimal'
  );
}

// ── 댓글 ──
export async function postComment(memeId: number, nick: string, body: string, user: { id: string } | null) {
  const inserted = await sbPost('meme_comments', {
    meme_id: memeId,
    nick,
    body,
    is_user: !!user,
    user_id: user ? user.id : null,
  });
  return Array.isArray(inserted) ? inserted[0] : inserted;
}

// 본인/관리자 댓글 수정·삭제 (RLS가 user_id=auth.uid() 또는 운영자 정책으로 허용)
export async function editComment(id: number, body: string) {
  await sbWrite('PATCH', `meme_comments?id=eq.${id}`, { body });
}
export async function deleteComment(id: number) {
  await sbWrite('DELETE', `meme_comments?id=eq.${id}`);
}

// 파일 업로드 → Supabase Storage('media' 버킷, 본인 uid 폴더). 반환: 공개 URL.
export async function uploadMedia(file: File, user: { id: string }): Promise<string> {
  const safe = (file.name || 'file').replace(/[^\w.\-]/g, '_').slice(-60);
  const path = `${user.id}/${Date.now()}-${safe}`;
  const r = await fetch(`${SB.url}/storage/v1/object/media/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': file.type || 'application/octet-stream' }),
    body: file,
  });
  if (!r.ok) throw new Error(`업로드 ${r.status}: ${await r.text()}`);
  return `${SB.url}/storage/v1/object/public/media/${path}`;
}

// ── 회원 밈 신청 (로그인 필요) ──
export interface Submission {
  id: number;
  name: string;
  description: string | null;
  status: 'pending' | 'withdrawn' | 'accepted' | 'rejected';
  created_at: string;
  withdrawn_at: string | null;
  photo_url: string | null;
  video_url: string | null;
  media: MediaItem[] | null;
}
export interface SubmissionInput {
  name: string;
  description?: string;
  example?: string;
  source_url?: string;
  tags?: string[];
  media?: MediaItem[];
}
export async function submitMeme(input: SubmissionInput, user: { id: string; email: string; name: string }) {
  const rows = await sbPost('meme_submissions', {
    user_id: user.id,
    email: user.email,
    nick: user.name,
    name: input.name,
    description: input.description || null,
    example: input.example || null,
    source_url: input.source_url || null,
    tags: input.tags || [],
    media: input.media || [],
    // 하위호환: 첫 이미지/동영상을 단일 컬럼에도 넣어둔다(관리자 단일필드·카드 커버용)
    photo_url: (input.media || []).find((x) => x.type === 'image')?.url || null,
    video_url: (input.media || []).find((x) => x.type === 'video')?.url || null,
  });
  return (Array.isArray(rows) ? rows[0] : rows) as Submission;
}
// RLS가 본인 신청만 반환(관리자는 전체 — 여긴 본인용 조회)
export async function fetchMySubmissions(): Promise<Submission[]> {
  const r = await fetch(
    `${SB.url}/rest/v1/meme_submissions?select=id,name,description,status,created_at,withdrawn_at,photo_url,video_url,media&order=created_at.desc`,
    { headers: headers() }
  );
  if (!r.ok) throw new Error(`GET submissions ${r.status}: ${await r.text()}`);
  return r.json();
}
export async function withdrawSubmission(id: number) {
  await sbWrite('PATCH', `meme_submissions?id=eq.${id}`, { status: 'withdrawn' });
}
// ── 관리자 인라인 편집 (memes RLS: admin write = is_admin) ──
// 편집용 원본 행(meme_cards 뷰엔 없는 keywords 등 포함). 읽기는 공개.
export async function fetchMemeRaw(id: number) {
  const r = await fetch(
    `${SB.url}/rest/v1/memes?id=eq.${id}&select=id,name,keywords,description,tags,category,status,source,photo_url,video_url,media`,
    { headers: headers() }
  );
  if (!r.ok) throw new Error(`GET meme ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}
export async function updateMeme(id: number, data: Record<string, unknown>) {
  await sbWrite('PATCH', `memes?id=eq.${id}`, data);
}
export async function deleteMemeById(id: number) {
  await sbWrite('DELETE', `memes?id=eq.${id}`);
}

// 중복 체크용 등록 밈 목록(공개 읽기). 이름/키워드 대조.
export interface RegisteredMeme {
  id: number;
  name: string;
  keywords: string[];
}
export async function fetchRegisteredMemes(): Promise<RegisteredMeme[]> {
  const r = await fetch(`${SB.url}/rest/v1/memes?select=id,name,keywords&order=id`, { headers: headers() });
  if (!r.ok) throw new Error(`GET memes ${r.status}: ${await r.text()}`);
  return r.json();
}
