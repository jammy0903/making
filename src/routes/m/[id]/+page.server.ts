// 밈 상세 SSR — "○○ 뜻" 검색 유입의 착지 페이지. 메타·OG는 +page.svelte의 svelte:head.
import { error } from '@sveltejs/kit';
import { sbGet, mapCard, loadComments, isEnLocale } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw error(404, '없는 밈입니다');

  const rows = await sbGet<Record<string, any>[]>(fetch, `meme_cards?id=eq.${id}&select=*`);
  if (!rows.length) throw error(404, '없는 밈입니다');

  // 이전/다음 밈 — id 순서(게시판식). created_at은 대량삽입 동시각이 많아 부적합.
  type Nb = { id: number; name: string; name_en: string | null };
  const [prevRows, nextRows, comments] = await Promise.all([
    sbGet<Nb[]>(fetch, `meme_cards?id=lt.${id}&select=id,name,name_en&order=id.desc&limit=1`).catch(() => [] as Nb[]),
    sbGet<Nb[]>(fetch, `meme_cards?id=gt.${id}&select=id,name,name_en&order=id.asc&limit=1`).catch(() => [] as Nb[]),
    loadComments(fetch, id).catch(() => []),
  ]);
  const en = isEnLocale();
  const nb = (r?: Nb) => (r ? { id: r.id, name: (en && r.name_en) || r.name } : null);
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120' });
  return { meme: mapCard(rows[0]), comments, prev: nb(prevRows[0]), next: nb(nextRows[0]) };
};
