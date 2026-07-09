import { publicTopics } from '$lib/publicTopics';
import { SITE } from '$lib/site';

/** 동적 sitemap.xml — 홈 + 모든 공개(샘플) 주제 URL */
export const prerender = true;

export function GET() {
	const urls = [
		{ loc: `${SITE}/`, priority: '1.0', changefreq: 'daily' },
		...publicTopics().map((t) => ({
			loc: `${SITE}/t/${encodeURIComponent(t.slug)}`,
			priority: '0.8',
			changefreq: 'weekly'
		}))
	];

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
