// 서버 handle: paraglide 미들웨어로 요청 locale 설정 + <html lang>·dir 치환.
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;
    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%lang%', locale),
    });
  });
