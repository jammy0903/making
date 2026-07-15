// 방문자 쓰기(투표·댓글) — 브라우저에서 Supabase REST 직결(anon + RLS). public/app.js 이식.
import { SB_URL, SB_KEY } from '$lib/sb';
import { headers } from '$lib/client/auth';

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
export type VoteChoice = 'yes' | 'no' | 'notmeme'; // 밈이다 / 죽은 밈이다 / 밈이 아니다
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
}
export interface SubmissionInput {
  name: string;
  description?: string;
  example?: string;
  source_url?: string;
  tags?: string[];
  photo_url?: string;
  video_url?: string;
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
    photo_url: input.photo_url || null,
    video_url: input.video_url || null,
  });
  return (Array.isArray(rows) ? rows[0] : rows) as Submission;
}
// RLS가 본인 신청만 반환(관리자는 전체 — 여긴 본인용 조회)
export async function fetchMySubmissions(): Promise<Submission[]> {
  const r = await fetch(
    `${SB.url}/rest/v1/meme_submissions?select=id,name,description,status,created_at,withdrawn_at,photo_url,video_url&order=created_at.desc`,
    { headers: headers() }
  );
  if (!r.ok) throw new Error(`GET submissions ${r.status}: ${await r.text()}`);
  return r.json();
}
export async function withdrawSubmission(id: number) {
  await sbWrite('PATCH', `meme_submissions?id=eq.${id}`, { status: 'withdrawn' });
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
