/**
 * 플레이 화면 SSR — 덱을 DB 정본에서 로드(decksRepo, 코드 폴백).
 * 없으면 deck=null → +page.svelte가 "주제를 찾을 수 없어요" 처리.
 */
import { loadDeck } from '$lib/server/decksRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	return { deck: (await loadDeck(params.deck ?? '')) ?? null };
};
