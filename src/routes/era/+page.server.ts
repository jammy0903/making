// 세대 판독기 SSR — era_year(전성기 연도)가 큐레이션된 밈만 출전 (db/era_year.sql)
import { error } from '@sveltejs/kit';
import { sbGet, isEnLocale, isKoreanRequest } from '$lib/server/db';
import type { PageServerLoad } from './$types';

type Row = { id: number; name: string; name_en: string | null; photo_url: string | null; era_year: number; tags: string[] | null };

export const load: PageServerLoad = async ({ fetch, setHeaders, request }) => {
  const rows = await sbGet<Row[]>(
    fetch,
    'memes?select=id,name,name_en,photo_url,era_year,tags&era_year=not.is.null&order=era_year.asc'
  );
  // IP 기준 국가 필터 — 한국 IP는 한국밈만, 그 외는 미국밈만 출제 (tags의 '#미국'로 원산지 판정)
  const kr = isKoreanRequest(request);
  const filtered = rows.filter((r) => (r.tags || []).includes('#미국') !== kr);
  if (filtered.length < 12) throw error(503, '판독기 준비 중입니다');

  const en = isEnLocale();
  const pool = filtered.map((r) => ({
    id: r.id,
    name: (en && r.name_en) || r.name,
    photo: r.photo_url || '',
    year: r.era_year,
  }));

  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600', vary: 'x-vercel-ip-country, accept-language' });
  return { pool };
};
