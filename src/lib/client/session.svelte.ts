// 로그인 세션 공유 상태 (Svelte 5 룬 — 레이아웃이 채우고 페이지가 읽음)
import type { AuthUser } from '$lib/client/auth';

export const user = $state<{ current: AuthUser | null }>({ current: null });

export function setUser(u: AuthUser | null) {
  user.current = u;
}
