// 홈 SSR — 순위(스테디)·새로 뜬을 서버에서 렌더(SEO의 시작점)
import { loadCards } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
  const cards = await loadCards(fetch);
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=300' }); // CDN 5분 캐시
  return { cards };
};
