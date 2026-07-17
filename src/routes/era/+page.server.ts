// 세대 판독기 SSR — era_year(전성기 연도)가 큐레이션된 밈만 출전 (db/era_year.sql)
import { error } from '@sveltejs/kit';
import { sbGet, isEnLocale } from '$lib/server/db';
import type { PageServerLoad } from './$types';

type Row = { id: number; name: string; name_en: string | null; photo_url: string | null; era_year: number };

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
  const rows = await sbGet<Row[]>(
    fetch,
    'memes?select=id,name,name_en,photo_url,era_year&era_year=not.is.null&order=era_year.asc'
  );
  if (rows.length < 12) throw error(503, '판독기 준비 중입니다');

  const en = isEnLocale();
  const pool = rows.map((r) => ({
    id: r.id,
    name: (en && r.name_en) || r.name,
    photo: r.photo_url || '',
    year: r.era_year,
  }));

  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600' }); // 큐레이션 데이터라 갱신 드묾
  return { pool };
};
