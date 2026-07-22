// 사이트맵 — 밈별 상세 URL 전부 색인 요청("○○ 뜻" 검색 유입의 통로).
// ko(무접두)·en(/en/) 양쪽을 xhtml:link 대체링크로 상호 연결(다국어 SEO).
import { sbGetAll } from '$lib/server/db';
import { JJAL_TAGS } from '$lib/server/jjalTags';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
  // 상한(1000행) 초과분까지 전부 — 잘리면 그만큼 URL이 사이트맵에서 빠진다.
  const rows = await sbGetAll<{ id: number; last_activity: string }>(
    fetch,
    'meme_cards?select=id,last_activity&order=id.asc'
  );
  const origin = url.origin;
  const enOf = (path: string) => `${origin}/en${path === '/' ? '/' : path}`;
  const koOf = (path: string) => `${origin}${path}`;
  const alts = (path: string) =>
    `<xhtml:link rel="alternate" hreflang="ko" href="${koOf(path)}"/>` +
    `<xhtml:link rel="alternate" hreflang="en" href="${enOf(path)}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${koOf(path)}"/>`;
  // 경로마다 ko·en 두 <url> (둘 다 동일 alternate 세트)
  const pair = (path: string, extra = '') =>
    `  <url><loc>${koOf(path)}</loc>${alts(path)}${extra}</url>\n` +
    `  <url><loc>${enOf(path)}</loc>${alts(path)}${extra}</url>`;

  // 짤은 아직 i18n 미적용(한국어 전용)이라 en 대체링크를 만들지 않는다 — 없는 번역을 가리키게 된다
  const single = (path: string, extra = '') => `  <url><loc>${koOf(path)}</loc>${extra}</url>`;

  const staticUrls = [pair('/', '<priority>1.0</priority>'), pair('/all', '<priority>0.8</priority>'), pair('/game', '<priority>0.6</priority>'), pair('/era', '<priority>0.6</priority>'), pair('/about'), single('/jjal', '<priority>0.8</priority>')].join('\n');
  const memeUrls = rows
    .map((r) => pair(`/m/${r.id}`, `<lastmod>${String(r.last_activity).slice(0, 10)}</lastmod>`))
    .join('\n');
  // 짤 상세 — 캡션·키워드를 가진 색인 대상만(docs/jjal-seo-plan.md: 텍스트가 유일한 색인 재료)
  const jjals = await sbGetAll<{ id: number }>(
    fetch,
    'jjals?select=id&status=eq.live&caption=not.is.null&order=id.asc'
  );
  const jjalUrls = jjals.map((r) => single(`/jjal/${r.id}`)).join('\n');
  // 태그 랜딩 — 도입 문단을 가진 큐레이션 태그만(Phase 2 원칙)
  const tagUrls = JJAL_TAGS.map((t) =>
    single(`/jjal/tag/${encodeURIComponent(t.keyword)}`, '<priority>0.7</priority>')
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticUrls}
${memeUrls}
${tagUrls}
${jjalUrls}
</urlset>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'cache-control': 'public, max-age=0, s-maxage=3600' },
  });
};
