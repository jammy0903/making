/**
 * Supabase 브라우저 클라이언트 + 익명 세션 id.
 * 환경변수 미설정이거나 네트워크 실패 시 조용히 null 반환 → 기능만 꺼지고 앱은 정상.
 * (공감 리그 데이터 계층은 여기 위에 새로 구현한다 — 대결 기록·제보·투표 등)
 */
import { env } from '$env/dynamic/public';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let tried = false;

export function getSupabase(): SupabaseClient | null {
	if (tried) return client;
	tried = true;
	const url = env.PUBLIC_SUPABASE_URL;
	const key = env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) return null;
	client = createClient(url, key, { auth: { persistSession: false } });
	return client;
}

const SESSION_KEY = 'gonggam_session';

/** 익명 세션 id(브라우저 localStorage의 uuid). 접속자 식별 아님, 통계·가중치용. */
export function sessionId(): string {
	if (typeof localStorage === 'undefined') return '';
	let id = localStorage.getItem(SESSION_KEY);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(SESSION_KEY, id);
	}
	return id;
}
