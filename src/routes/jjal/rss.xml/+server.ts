// 짤 RSS — 네이버가 사이트맵과 별도로 요구하는 피드(docs/jjal-seo-plan.md Phase 3).
// 최근 등록 짤 50개. 캡션 있는 것만: 제목 없는 아이템은 피드에서도 쓰레기다.
import { sbGet } from '$lib/server/db';
import type { RequestHandler } from './$types';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: RequestHandler = async ({ fetch, url }) => {
  const rows = await sbGet<
    { id: number; caption: string; image_url: string; created_at: string }[]
  >(
    fetch,
    'jjals?select=id,caption,image_url,created_at&status=eq.live&caption=not.is.null&order=id.desc&limit=50'
  );
  const origin = url.origin;

  const items = rows
    .map((r) => {
      const link = `${origin}/jjal/${r.id}`;
      return `    <item>
      <title>${esc(r.caption)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(r.created_at).toUTCString()}</pubDate>
      <description>${esc(r.caption)} — 복사·다운로드해서 메신저에 바로 쓰는 짤</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>memedics 짤 보관소</title>
    <link>${origin}/jjal</link>
    <description>상황·감정으로 검색하는 짤 보관소 — 최근 등록된 짤</description>
    <language>ko</language>
${items}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'cache-control': 'public, max-age=0, s-maxage=3600' },
  });
};
