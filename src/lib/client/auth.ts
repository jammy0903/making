// 공유 Supabase Auth (Google 암시적 OAuth) — public/auth.js 이식. 클라 전용(localStorage).
// 레이아웃 onMount에서 initAuth()를 호출해 OAuth 콜백 해시를 처리한다.
import { env } from '$env/dynamic/public';

const KEY = 'mmd-token';
const SB = { url: env.PUBLIC_SUPABASE_URL || '', key: env.PUBLIC_SUPABASE_ANON_KEY || '' };

function saveHashToken() {
  if (!location.hash.includes('access_token')) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const at = p.get('access_token');
  if (at) {
    localStorage.setItem(KEY, JSON.stringify({ at, exp: Date.now() + Number(p.get('expires_in') || 3600) * 1000 }));
    history.replaceState(null, '', location.pathname);
  }
}

export function token(): string | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (t && t.exp > Date.now() + 5000) return t.at;
  } catch {
    /* 파싱 실패 = 토큰 없음 */
  }
  return null;
}

export function login() {
  location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

export function logout() {
  localStorage.removeItem(KEY);
  location.reload();
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function whoami(): Promise<AuthUser | null> {
  if (!token()) return null;
  const r = await fetch(`${SB.url}/auth/v1/user`, { headers: { apikey: SB.key, Authorization: `Bearer ${token()}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return { id: u.id, email: u.email, name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email };
}

// apikey는 anon, Authorization은 로그인 시 유저 토큰(아니면 anon)
export function headers(extra: Record<string, string> = {}) {
  return { apikey: SB.key, Authorization: `Bearer ${token() || SB.key}`, ...extra };
}

export function initAuth() {
  saveHashToken();
}
