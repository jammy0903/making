// 짤 보관소 첫 진입 — 인기 키워드 칩 + 최신 짤 그리드
import { recentJjals } from '$lib/server/jjal';
import type { PageServerLoad } from './$types';

// 등록 물량이 쌓이면 jjal_queries 로그 기반으로 교체(설계서 6장)
const CHIPS = ['고양이', '병맛', '강아지', '리액션', '예능', '어이없음', '분노', '절규', '충격', '눈물'];

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
  const jjals = await recentJjals(fetch);
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=600' });
  return { jjals, chips: CHIPS };
};
