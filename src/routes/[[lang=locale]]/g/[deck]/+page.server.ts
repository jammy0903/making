/**
 * 플레이 화면 SSR — 덱을 DB 정본에서 로드(decksRepo, 코드 폴백).
 * 없으면 deck=null → +page.svelte가 "주제를 찾을 수 없어요" 처리.
 *
 * 공유 전파(바이럴): ?r=(결과)·?vs=(도전) 코드로 og:title/description(레버 ①)과
 * og:image(레버 ②, /og/[deck] PNG)를 SSR로 넘긴다. 카톡·인스타 미리보기 봇은 JS를 안 돌려
 * 클라이언트 onMount 결과를 못 보므로, 미리보기가 결과를 보여주려면 반드시 서버에서 만들어야 한다.
 */
import { loadDeck } from '$lib/server/decksRepo';
import { ogText } from '$lib/game/share';
import { SITE } from '$lib/site';
import type { PageServerLoad } from './$types';

export interface OgMeta {
	title: string;
	description: string;
	image: string;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const deck = (await loadDeck(params.deck ?? '')) ?? null;
	if (!deck) return { deck: null, og: null };

	const { title, description } = ogText(deck, url.searchParams);
	// og 이미지: 결과/도전 코드를 그대로 물려 결과별 PNG를 가리킨다(절대 URL — 봇이 SSR HTML에서 읽음).
	const q = url.searchParams.get('vs')
		? `?vs=${url.searchParams.get('vs')}`
		: url.searchParams.get('r')
			? `?r=${url.searchParams.get('r')}`
			: '';
	const og: OgMeta = { title, description, image: `${SITE}/og/${deck.id}${q}` };
	return { deck, og };
};
