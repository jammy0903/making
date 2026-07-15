// 사이트맵 — 밈별 상세 URL 전부 색인 요청("○○ 뜻" 검색 유입의 통로)
import { sbGet } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
  const rows = await sbGet<{ id: number; last_activity: string }[]>(
    fetch,
    'meme_cards?select=id,last_activity&order=id'
  );
  const origin = url.origin;
  const urls = rows
    .map(
      (r) => `  <url><loc>${origin}/m/${r.id}</loc><lastmod>${String(r.last_activity).slice(0, 10)}</lastmod></url>`
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><priority>1.0</priority></url>
  <url><loc>${origin}/all</loc><priority>0.8</priority></url>
  <url><loc>${origin}/about</loc></url>
${urls}
</urlset>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'cache-control': 'public, max-age=0, s-maxage=3600' },
  });
};
