// 밈 상세 SSR — "○○ 뜻" 검색 유입의 착지 페이지. 메타·OG는 +page.svelte의 svelte:head.
import { error } from '@sveltejs/kit';
import { sbGet, mapCard, loadComments } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw error(404, '없는 밈입니다');

  const rows = await sbGet<Record<string, any>[]>(fetch, `meme_cards?id=eq.${id}&select=*`);
  if (!rows.length) throw error(404, '없는 밈입니다');

  const comments = await loadComments(fetch, id).catch(() => []);
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120' });
  return { meme: mapCard(rows[0]), comments };
};
