// 짤 상세 — 색인 대상 페이지(docs/jjal-seo-plan.md Phase 1).
// 네이버 가이드가 "모든 콘텐츠가 JS로 로딩되는 구조"를 미노출 사유로 명시하므로 SSR로 내려준다.
import { error } from '@sveltejs/kit';
import { getJjal, relatedJjals } from '$lib/server/jjal';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params, setHeaders }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw error(404, '없는 짤이에요');

  const jjal = await getJjal(fetch, id);
  if (!jjal) throw error(404, '없는 짤이에요'); // soft 404 금지 — 크롤 예산이 샌다

  const related = await relatedJjals(fetch, jjal);
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600' });
  return { jjal, related };
};
