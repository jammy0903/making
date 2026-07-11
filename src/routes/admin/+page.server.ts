/**
 * 관리자 대시보드(서버 전용). 공유 비밀번호(env ADMIN_PASSWORD)로 게이트,
 * service_role로 집계·신청 관리. 익명 앱과 분리 — /admin 은 noindex(+layout에서 로봇 차단).
 */
import { fail, redirect } from '@sveltejs/kit';
import { DECKS, type Deck } from '$lib/game/decks';
import {
	getAdminDb,
	checkAdminPassword,
	isAuthed,
	isAdminConfigured,
	adminCookieToken,
	ADMIN_COOKIE
} from '$lib/server/adminDb';
import { loadDecksForAdmin, saveDeck, importCodeDecks } from '$lib/server/decksRepo';
import type { Actions, PageServerLoad } from './$types';

/** 저장 전 최소 검증 — 구조가 깨진 덱이 DB로 들어가 앱이 터지는 걸 막는다. */
function validateDeck(d: unknown): { ok: true; deck: Deck } | { ok: false; error: string } {
	const x = d as Partial<Deck>;
	if (!x || typeof x !== 'object') return { ok: false, error: '덱 형식 오류' };
	if (!x.id || !x.title || !x.type) return { ok: false, error: 'id·제목·유형은 필수' };
	if (!x.a?.name || !x.b?.name) return { ok: false, error: '양편 이름 필수' };
	if (!Array.isArray(x.a.penalties) || !Array.isArray(x.b.penalties)) {
		return { ok: false, error: '조건 배열 오류' };
	}
	return { ok: true, deck: x as Deck };
}

const COOKIE_OPTS = {
	path: '/admin',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: true,
	maxAge: 60 * 60 * 24 * 7 // 7일
};

interface DeckStat {
	id: string;
	title: string;
	plays: number;
	prefA: number;
	prefB: number;
	nameA: string;
	nameB: string;
	avgDepth: number;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const configured = isAdminConfigured();
	const authed = isAuthed(cookies.get(ADMIN_COOKIE));
	if (!authed) return { configured, authed: false };

	const db = getAdminDb();
	if (!db) return { configured: false, authed: true };

	// 고유 방문자(관리자 제외)
	const { count: visitors } = await db
		.from('visits')
		.select('*', { count: 'exact', head: true })
		.eq('is_admin', false);

	// 플레이 로그(집계는 JS에서). 규모 커지면 RPC group by로 옮긴다.
	const { data: plays } = await db.from('plays').select('deck_id,pref_side,depth_a,depth_b');

	const byDeck = new Map<string, DeckStat>();
	for (const d of DECKS) {
		byDeck.set(d.id, {
			id: d.id,
			title: d.title,
			plays: 0,
			prefA: 0,
			prefB: 0,
			nameA: d.a.name,
			nameB: d.b.name,
			avgDepth: 0
		});
	}
	const depthSum = new Map<string, number>();
	for (const p of plays ?? []) {
		const s = byDeck.get(p.deck_id);
		if (!s) continue;
		s.plays++;
		if (p.pref_side === 0) s.prefA++;
		else if (p.pref_side === 1) s.prefB++;
		const depth = p.pref_side === 0 ? (p.depth_a ?? 0) : (p.depth_b ?? 0);
		depthSum.set(p.deck_id, (depthSum.get(p.deck_id) ?? 0) + depth);
	}
	for (const s of byDeck.values()) {
		s.avgDepth = s.plays ? Math.round(((depthSum.get(s.id) ?? 0) / s.plays) * 10) / 10 : 0;
	}
	const deckStats = [...byDeck.values()].sort((a, b) => b.plays - a.plays);
	const totalPlays = deckStats.reduce((n, s) => n + s.plays, 0);

	// 신청 목록
	const { data: requests } = await db
		.from('deck_requests')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(200);

	// 편집용 덱(정본 = DB, 비었으면 코드). data 전체를 폼으로 넘긴다.
	const decks = await loadDecksForAdmin();

	return {
		configured: true,
		authed: true,
		visitors: visitors ?? 0,
		totalPlays,
		deckStats,
		requests: requests ?? [],
		decks
	};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const sessionId = String(form.get('session_id') ?? '');
		if (!checkAdminPassword(password)) {
			return fail(401, { error: '비밀번호가 틀렸습니다.' });
		}
		const token = adminCookieToken();
		if (token) cookies.set(ADMIN_COOKIE, token, COOKIE_OPTS);
		// 관리자 자기 세션은 방문자 집계에서 제외
		if (sessionId) {
			const db = getAdminDb();
			if (db) {
				await db
					.from('visits')
					.upsert({ session_id: sessionId, is_admin: true }, { onConflict: 'session_id' });
			}
		}
		throw redirect(303, '/admin');
	},

	logout: async ({ cookies }) => {
		cookies.delete(ADMIN_COOKIE, { path: '/admin' });
		throw redirect(303, '/admin');
	},

	decide: async ({ request, cookies }) => {
		if (!isAuthed(cookies.get(ADMIN_COOKIE))) return fail(401, { error: '권한 없음' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const decision = String(form.get('decision') ?? '');
		if (!id || (decision !== 'accepted' && decision !== 'rejected')) {
			return fail(400, { error: '잘못된 요청' });
		}
		const db = getAdminDb();
		if (!db) return fail(500, { error: 'DB 미설정' });
		const { error } = await db
			.from('deck_requests')
			.update({ status: decision, decided_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},

	// 코드(decks.ts)의 덱을 DB로 1회 이관(시드). 이관 후엔 DB가 정본.
	import_decks: async ({ cookies }) => {
		if (!isAuthed(cookies.get(ADMIN_COOKIE))) return fail(401, { error: '권한 없음' });
		const r = await importCodeDecks();
		if (!r.ok) return fail(500, { error: r.error });
		return { ok: true, imported: r.count };
	},

	// 덱 1개 저장(폼에서 만든 deck JSON을 검증 후 upsert).
	save_deck: async ({ request, cookies }) => {
		if (!isAuthed(cookies.get(ADMIN_COOKIE))) return fail(401, { error: '권한 없음' });
		const form = await request.formData();
		let parsed: unknown;
		try {
			parsed = JSON.parse(String(form.get('deck_json') ?? ''));
		} catch {
			return fail(400, { error: 'JSON 파싱 실패' });
		}
		const v = validateDeck(parsed);
		if (!v.ok) return fail(400, { error: v.error });
		// stats 빈 줄 정리(편집 중 허용했던 빈 줄 제거).
		const rc = v.deck.resultCards;
		if (rc) {
			for (const side of [rc.a, rc.b]) {
				for (const c of [side.extreme, side.mild]) {
					c.stats = (c.stats ?? []).map((s) => s.trim()).filter(Boolean);
				}
			}
		}
		const sortRaw = form.get('sort');
		const sort = sortRaw != null && sortRaw !== '' ? Number(sortRaw) : undefined;
		const r = await saveDeck(v.deck, sort);
		if (!r.ok) return fail(500, { error: r.error });
		return { ok: true, saved: v.deck.id };
	}
};
