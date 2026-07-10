/**
 * 관리자 대시보드(서버 전용). 공유 비밀번호(env ADMIN_PASSWORD)로 게이트,
 * service_role로 집계·신청 관리. 익명 앱과 분리 — /admin 은 noindex(+layout에서 로봇 차단).
 */
import { fail, redirect } from '@sveltejs/kit';
import { DECKS } from '$lib/game/decks';
import {
	getAdminDb,
	checkAdminPassword,
	isAuthed,
	isAdminConfigured,
	adminCookieToken,
	ADMIN_COOKIE
} from '$lib/server/adminDb';
import type { Actions, PageServerLoad } from './$types';

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

	return {
		configured: true,
		authed: true,
		visitors: visitors ?? 0,
		totalPlays,
		deckStats,
		requests: requests ?? []
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
	}
};
