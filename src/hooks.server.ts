import type { Handle } from '@sveltejs/kit';
import { pickLocale, locales, defaultLocale, type Locale } from '$lib/i18n';

/**
 * 로케일 감지: 쿠키(사용자 선택) > 브라우저 언어(Accept-Language) > IP 국가(Vercel).
 * 결정된 로케일을 locals 로 넘기고, app.html 의 %lang% 를 실제 값으로 치환한다.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get('locale') as Locale | undefined;
	const locale: Locale =
		cookie && locales.includes(cookie)
			? cookie
			: pickLocale(
					event.request.headers.get('accept-language'),
					event.request.headers.get('x-vercel-ip-country')
				);
	event.locals.locale = locale;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale || defaultLocale)
	});
};
