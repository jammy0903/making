/**
 * 덱 저장소(서버 전용). DB가 정본 — is_public 덱의 data(jsonb)를 읽는다.
 * DB 미설정/비어있음/에러면 코드(decks.ts DECKS)로 폴백 → 시드 전에도 앱 정상.
 * 읽기는 anon(공개 RLS), 쓰기(관리자 편집·이관)는 service_role.
 */
import { env as pub } from '$env/dynamic/public';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAdminDb } from './adminDb';
import { DECKS, type Deck } from '$lib/game/decks';

let anon: SupabaseClient | null = null;
let tried = false;
function readDb(): SupabaseClient | null {
	if (tried) return anon;
	tried = true;
	const url = pub.PUBLIC_SUPABASE_URL;
	const key = pub.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) return null;
	anon = createClient(url, key, { auth: { persistSession: false } });
	return anon;
}

/**
 * 공개 덱 목록. DB에 덱이 있으면 그게 정본(순서=sort), 없거나 실패면 코드 DECKS로 폴백.
 */
export async function loadDecks(): Promise<Deck[]> {
	const sb = readDb();
	if (!sb) return DECKS;
	try {
		const { data, error } = await sb
			.from('decks')
			.select('data')
			.eq('is_public', true)
			.order('sort', { ascending: true });
		if (error || !data) return DECKS;
		// 옛 시드 행은 data=null일 수 있음 → 걸러내고, 남은 게 없으면 코드 폴백.
		const decks = data.map((r) => r.data as Deck).filter(Boolean);
		return decks.length ? decks : DECKS;
	} catch {
		return DECKS;
	}
}

/** 단일 덱(플레이 화면). 없으면 undefined → 화면은 "주제 없음" 처리. */
export async function loadDeck(id: string): Promise<Deck | undefined> {
	const decks = await loadDecks();
	return decks.find((d) => d.id === id);
}

/** 관리자 편집 화면용: 비공개 포함 전체(정본 = DB에 있는 것). DB 비었으면 코드 DECKS. */
export async function loadDecksForAdmin(): Promise<Deck[]> {
	const db = getAdminDb();
	if (!db) return DECKS;
	const { data, error } = await db
		.from('decks')
		.select('data')
		.order('sort', { ascending: true });
	if (error || !data) return DECKS;
	const decks = data.map((r) => r.data as Deck).filter(Boolean);
	return decks.length ? decks : DECKS;
}

/** 덱 1개 저장(upsert). 관리자 편집. */
export async function saveDeck(deck: Deck, sort?: number): Promise<{ ok: boolean; error?: string }> {
	const db = getAdminDb();
	if (!db) return { ok: false, error: 'DB 미설정(service_role 필요)' };
	const row: Record<string, unknown> = {
		id: deck.id,
		title: deck.title,
		emoji: deck.icon,
		data: deck,
		is_public: true,
		updated_at: new Date().toISOString()
	};
	if (typeof sort === 'number') row.sort = sort;
	const { error } = await db.from('decks').upsert(row, { onConflict: 'id' });
	return error ? { ok: false, error: error.message } : { ok: true };
}

/** 코드(decks.ts)의 덱을 DB로 1회 이관(시드). 이미 있으면 덮어씀. */
export async function importCodeDecks(): Promise<{ ok: boolean; count: number; error?: string }> {
	const db = getAdminDb();
	if (!db) return { ok: false, count: 0, error: 'DB 미설정(service_role 필요)' };
	const rows = DECKS.map((deck, i) => ({
		id: deck.id,
		title: deck.title,
		emoji: deck.icon,
		data: deck,
		is_public: true,
		sort: i,
		updated_at: new Date().toISOString()
	}));
	const { error } = await db.from('decks').upsert(rows, { onConflict: 'id' });
	return error ? { ok: false, count: 0, error: error.message } : { ok: true, count: rows.length };
}
