import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
  // Yeti(네이버 봇)를 따로 명시한다 — 서치어드바이저 가이드가 요구하는 형식.
  // IP 대역은 수시로 바뀌므로 UA 기준으로만 허용한다.
  const body = `User-agent: *
Allow: /

User-agent: Yeti
Allow: /

Sitemap: ${url.origin}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
