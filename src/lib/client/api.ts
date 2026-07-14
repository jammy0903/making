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

// ── 투표 (월 1회 재판정 — localStorage {c,t} + DB month_bucket PK와 동일 기준) ──
export function voterId() {
  let v = localStorage.getItem('meme-voter');
  if (!v) {
    v = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('meme-voter', v);
  }
  return v;
}
type VotedEntry = { c: 'yes' | 'no'; t: number };
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
export function markVoted(id: number | string, choice: 'yes' | 'no') {
  const m = votedMap();
  m[String(id)] = { c: choice, t: Date.now() };
  localStorage.setItem('meme-voted', JSON.stringify(m));
}
export async function castVote(memeId: number, choice: 'yes' | 'no') {
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
