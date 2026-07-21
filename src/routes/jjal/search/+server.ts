// 짤 검색 API — POST {q}. prerender=false 필수(빠지면 배포 시 파일로 다운로드되는 기존 이슈).
import { json, error } from '@sveltejs/kit';
import { searchJjals, QUERY_MAX } from '$lib/server/jjal';
import type { RequestHandler } from './$types';

export const prerender = false;

export const POST: RequestHandler = async ({ request, fetch }) => {
  let q = '';
  try {
    q = String((await request.json()).q ?? '');
  } catch {
    throw error(400, 'bad body');
  }
  if (!q.trim()) return json({ jjals: [] });
  if (q.length > QUERY_MAX) throw error(400, 'query too long');
  const jjals = await searchJjals(fetch, q);
  return json({ jjals });
};
