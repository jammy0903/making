import type { Handle } from '@sveltejs/kit';
import { splitLocale } from '$lib/i18n';

/**
 * 로케일을 URL 경로로 결정 (/ = ko, /en, /zh).
 * app.html 의 <html lang="%lang%"> 를 URL 로케일로 치환한다.
 * (쿠키/지역 감지 없음 — 다국어 SEO 위해 언어별 URL 이 정본)
 */
export const handle: Handle = async ({ event, resolve }) => {
	// P2: www → apex 301 정규화(중복 호스트 방지). 정본은 codeinsight.online.
	const host = event.request.headers.get('host');
	if (host === 'www.codeinsight.online') {
		return new Response(null, {
			status: 301,
			headers: { location: `https://codeinsight.online${event.url.pathname}${event.url.search}` }
		});
	}

	const { locale } = splitLocale(event.url.pathname);
	event.locals.locale = locale;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
};
