// 태그 랜딩 — 큐레이션된 키워드만 존재한다(docs/jjal-seo-plan.md Phase 2).
// 목록에 없는 태그는 404: 도입 문단 없는 페이지를 색인시키지 않는다는 원칙의 강제 장치.
import { error } from '@sveltejs/kit';
import { getTag, tagJjals, JJAL_TAGS } from '$lib/server/jjalTags';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params, setHeaders }) => {
  const tag = getTag(params.tag);
  if (!tag) throw error(404, '없는 태그예요');

  const jjals = await tagJjals(fetch, tag.keyword);
  if (!jjals.length) throw error(404, '없는 태그예요'); // 재고 0인 태그도 색인 대상이 아니다

  // 다른 태그로의 내부 링크 — 크롤 경로이자 탐색 동선
  const others = JJAL_TAGS.filter((t) => t.keyword !== tag.keyword).map((t) => ({
    keyword: t.keyword,
    title: t.title,
  }));

  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600' });
  return { tag, jjals, others };
};
