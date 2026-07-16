// 서버 handle: ①지오IP 기본 언어(한국 IP→한국어, 그 외→영어) ②paraglide locale + <html lang> 치환.
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle } from '@sveltejs/kit';

// 크롤러는 지오 리다이렉트에서 제외 — 구글봇 등이 실제 경로를 그대로 색인하게(hreflang로 상호연결).
const BOT = /bot|crawl|spider|slurp|bingbot|googlebot|yandexbot|baidu|duckduckbot|facebookexternalhit|embedly|whatsapp|telegrambot/i;

export const handle: Handle = ({ event, resolve }) => {
  const path = event.url.pathname;
  const isEn = path === '/en' || path.startsWith('/en/');
  const ua = event.request.headers.get('user-agent') || '';
  const wantsHtml = (event.request.headers.get('accept') || '').includes('text/html');
  const chosen = event.cookies.get('PARAGLIDE_LOCALE'); // KO/EN 토글 시 설정됨 → 있으면 사용자 선택 존중
  // 비한국 판별: Vercel 지오IP(x-vercel-ip-country)가 오면 그걸로, 없으면(엣지 아닌 Node 함수 등)
  // 브라우저 언어(Accept-Language)로 폴백. **신호가 아예 없으면 기본=한국어**(리다이렉트 안 함) —
  // 즉 "긍정적 비한국 신호"가 있을 때만 영어로 보낸다.
  const country = event.request.headers.get('x-vercel-ip-country');
  const acceptLang = event.request.headers.get('accept-language') || '';
  let nonKorean = false;
  if (country) nonKorean = country !== 'KR';
  else if (acceptLang) nonKorean = !/(^|,|\s)ko(-|;|,|$)/i.test(acceptLang);
  // (country·acceptLang 둘 다 없으면 nonKorean=false → 한국어 기본)

  // 최초 방문 + 비한국 신호 + ko(무접두) HTML 페이지 → /en/으로 진짜 리다이렉트(307). 봇·쿠키·이미 en·에셋은 제외.
  if (
    event.request.method === 'GET' && wantsHtml && !isEn && !chosen &&
    nonKorean && !BOT.test(ua)
  ) {
    return new Response(null, { status: 307, headers: { location: `/en${path === '/' ? '/' : path}${event.url.search}` } });
  }

  return paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;
    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%lang%', locale),
    });
  });
};
