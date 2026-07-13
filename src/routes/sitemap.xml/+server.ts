import { SITE } from '$lib/site';
import { DECKS } from '$lib/game/decks';
import { locales, localePath, defaultLocale } from '$lib/i18n';

/**
 * 동적 sitemap.xml — 홈·통계·신청 + 모든 덱 플레이 페이지(/g/{id}).
 * 덱 목록은 코드 DECKS 기준(id 안정적, 빌드 시 네트워크 불필요). 각 URL에 로케일 hreflang 대체 포함.
 */
export const prerender = true;

interface Entry {
	path: string;
	priority: string;
	changefreq: string;
}

export function GET() {
	const lastmod = new Date().toISOString().slice(0, 10);
	const entries: Entry[] = [
		{ path: '/', priority: '1.0', changefreq: 'daily' },
		{ path: '/stats', priority: '0.7', changefreq: 'daily' },
		{ path: '/suggest', priority: '0.5', changefreq: 'monthly' },
		...DECKS.map((d) => ({ path: `/g/${d.id}`, priority: '0.9', changefreq: 'weekly' }))
	];

	// 각 URL: 정본(ko) loc + ko/en/zh + x-default hreflang 대체(다국어 SEO).
	const altLinks = (path: string) =>
		[...locales, 'x-default' as const]
			.map((l) => {
				const loc = l === 'x-default' ? defaultLocale : l;
				return `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${localePath(loc, path)}"/>`;
			})
			.join('\n');

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
		entries
			.map(
				(e) =>
					`  <url>\n` +
					`    <loc>${SITE}${localePath(defaultLocale, e.path)}</loc>\n` +
					`    <lastmod>${lastmod}</lastmod>\n` +
					`    <changefreq>${e.changefreq}</changefreq>\n` +
					`    <priority>${e.priority}</priority>\n` +
					`${altLinks(e.path)}\n` +
					`  </url>`
			)
			.join('\n') +
		`\n</urlset>\n`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
}
