// 밈 상세 SSR — "○○ 뜻" 검색 유입의 착지 페이지. 메타·OG는 +page.svelte의 svelte:head.
import { error } from '@sveltejs/kit';
import { sbGet, mapCard, loadComments, isEnLocale } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw error(404, '없는 밈입니다');

  // 이전/다음/댓글 쿼리는 본문 조회 결과에 의존하지 않는다(id만 있으면 됨) — 본문을
  // 먼저 기다렸다 나머지를 병렬로 부르던 걸(왕복 2회) 넷 다 동시에 쏘도록 합쳤다(왕복 1회).
  // 본문이 없는 404 케이스에선 나머지 3개가 낭비되지만, 압도적으로 흔한 200 케이스가 더 중요하다.
  type Nb = { id: number; name: string; name_en: string | null };
  const [rows, prevRows, nextRows, comments] = await Promise.all([
    sbGet<Record<string, any>[]>(fetch, `meme_cards?id=eq.${id}&select=*`),
    sbGet<Nb[]>(fetch, `meme_cards?id=lt.${id}&select=id,name,name_en&order=id.desc&limit=1`).catch(() => [] as Nb[]),
    sbGet<Nb[]>(fetch, `meme_cards?id=gt.${id}&select=id,name,name_en&order=id.asc&limit=1`).catch(() => [] as Nb[]),
    loadComments(fetch, id).catch(() => []),
  ]);
  if (!rows.length) throw error(404, '없는 밈입니다');
  const en = isEnLocale();
  const nb = (r?: Nb) => (r ? { id: r.id, name: (en && r.name_en) || r.name } : null);
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120' });
  return { meme: mapCard(rows[0]), comments, prev: nb(prevRows[0]), next: nb(nextRows[0]) };
};
