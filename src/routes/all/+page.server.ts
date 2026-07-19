// 전체 밈 목록(HTML 사이트맵) — 350개 밈으로 가는 내부 링크를 한 페이지에 모아
// 검색엔진이 모든 상세 페이지를 발견·색인하도록 돕는다("discovered not indexed" 완화).
import { sbGetAll } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
  // 상한(1000행) 초과분까지 전부 — 여기서 잘리면 그만큼 상세 페이지가 색인에서 누락된다.
  const memes = await sbGetAll<{ id: number; name: string }>(
    fetch,
    'meme_cards?select=id,name&order=name.asc,id.asc'
  );
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=600' });
  return { memes };
};
