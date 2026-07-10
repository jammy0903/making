/**
 * 서버 전용 Supabase 클라이언트(service_role). RLS를 우회해 관리자 집계·신청 관리에 쓴다.
 * ⚠️ service_role 키는 절대 클라이언트로 나가면 안 됨 → $env/dynamic/private에서만 읽는다.
 * env 미설정이면 null → 관리자 페이지가 "미설정" 안내만 띄우고 조용히 꺼진다.
 */
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let tried = false;

export function getAdminDb(): SupabaseClient | null {
	if (tried) return client;
	tried = true;
	const url = pub.PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) return null;
	client = createClient(url, key, { auth: { persistSession: false } });
	return client;
}

/** 관리자 기능 설정 여부(비번 + service_role 둘 다 있어야 정상 동작). */
export function isAdminConfigured(): boolean {
	return !!env.ADMIN_PASSWORD && !!env.SUPABASE_SERVICE_ROLE_KEY;
}

/** 관리자 비밀번호 검증. env 미설정이면 항상 false(로그인 자체 불가). */
export function checkAdminPassword(input: string): boolean {
	const pw = env.ADMIN_PASSWORD;
	if (!pw) return false;
	return input === pw;
}

const COOKIE_SALT = 'geuronde-admin-v1';
export const ADMIN_COOKIE = 'gi_admin';

/** 로그인 쿠키에 담을 토큰(비번의 해시). 비번 미설정이면 null. 원문 비번은 쿠키에 안 담긴다. */
export function adminCookieToken(): string | null {
	const pw = env.ADMIN_PASSWORD;
	if (!pw) return null;
	return createHash('sha256').update(COOKIE_SALT + pw).digest('hex');
}

/** 쿠키 토큰이 유효한지(= 현재 비번 해시와 일치). */
export function isAuthed(cookieValue: string | undefined): boolean {
	const expected = adminCookieToken();
	return !!expected && !!cookieValue && cookieValue === expected;
}
