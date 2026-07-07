import type { Handle } from '@sveltejs/kit';
import { splitLocale } from '$lib/i18n';

/**
 * 로케일을 URL 경로로 결정 (/ = ko, /en, /zh).
 * app.html 의 <html lang="%lang%"> 를 URL 로케일로 치환한다.
 * (쿠키/지역 감지 없음 — 다국어 SEO 위해 언어별 URL 이 정본)
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { locale } = splitLocale(event.url.pathname);
	event.locals.locale = locale;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
};
