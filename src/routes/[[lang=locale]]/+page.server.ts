/**
 * 홈 SSR — decks 그리드 데이터(docs/game-design.md §B-4).
 * DB 정본(is_public), 미설정/비어있으면 코드 DECKS 폴백(decksRepo).
 */
import { loadDecks } from '$lib/server/decksRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { decks: await loadDecks() };
};
