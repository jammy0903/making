// 전체 밈 목록(HTML 사이트맵) — 350개 밈으로 가는 내부 링크를 한 페이지에 모아
// 검색엔진이 모든 상세 페이지를 발견·색인하도록 돕는다("discovered not indexed" 완화).
import { sbGet } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
  const memes = await sbGet<{ id: number; name: string }[]>(
    fetch,
    'meme_cards?select=id,name&order=name'
  );
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=600' });
  return { memes };
};
