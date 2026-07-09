import { SITE } from '$lib/site';

/** 동적 sitemap.xml — 홈. (랭킹게임 주제 URL은 피벗으로 제거; 밸런스게임 라우트 확정 시 추가) */
export const prerender = true;

export function GET() {
	const urls = [{ loc: `${SITE}/`, priority: '1.0', changefreq: 'daily' }];

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		urls
			.map(
				(u) =>
					`  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
			)
			.join('\n') +
		`\n</urlset>\n`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
}
