import { SITE } from '$lib/site';
import { locales, localePath, defaultLocale } from '$lib/i18n';

/**
 * 동적 sitemap.xml — 각 URL에 로케일 hreflang 대체 포함.
 * 리그·상황 페이지는 스키마 구현 후 여기에 추가한다(설계문서 v4 §3-4 딥링크).
 */
export const prerender = true;

interface Entry {
	path: string;
	priority: string;
	changefreq: string;
}

export function GET() {
	const lastmod = new Date().toISOString().slice(0, 10);
	const entries: Entry[] = [{ path: '/', priority: '1.0', changefreq: 'daily' }];

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
