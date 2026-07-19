// 결과카드 캔버스용 이미지 프록시.
// 카드는 <canvas>로 그려 toBlob으로 내보내는데, 외부 호스트(imgflip·kym·naver 등)는
// CORS 헤더(Access-Control-Allow-Origin)를 안 줘서 crossOrigin 로드가 실패 → 캔버스에
// 사진이 안 실린다. 이 라우트가 서버에서 이미지를 받아 same-origin으로 되돌려주면
// 캔버스가 오염 없이 읽을 수 있다. 페이지의 <img> 표시는 직접 URL을 그대로 쓰고,
// 캔버스 렌더(share.ts)에서만 이 프록시를 탄다.
//
// SSRF 방지: DB에 실제로 존재하는 이미지 CDN 도메인만 허용 + 원시 IP/로컬 차단 +
// 응답 content-type이 image/* 인지 검증 + 크기 상한.
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// 밈 사진이 실린 이미지 호스트의 등록가능 도메인(하위 도메인 변형까지 커버).
const ALLOW = [
  'imgflip.com', 'kym-cdn.com', 'namu.wiki', 'pinimg.com', 'ytimg.com', 'ggpht.com',
  'ruliweb.com', 'sndcdn.com', 'slidesharecdn.com', 'theqoo.net', 'dmitory.com',
  'extmovie.com', 'ezmember.co.kr', 'freepik.com', 'daumcdn.net', 'plaync.com',
  'naver.net', 'pstatic.net', 'jjalbang.today', 'fastly.net', 'googleusercontent.com',
  'orbi.kr', 'coupangcdn.com', 'hoyolab.com', 'inven.co.kr', 'wikimedia.org', '123rf.com',
  'fomos.kr', 'tenor.com', 'goodgag.net', 'ibispaint.com', 'maily.so', 'mania.kr',
  'slist.kr', 'melon.co.kr', 'cloudfront.net', 'dcinside.com', 'dcinside.co.kr',
  'cdnser.be', 'humoruniv.com', 'supabase.co', 'bobaedream.co.kr', 'instiz.net', 'pann.com',
];
const MAX = 8 * 1024 * 1024; // 8MB

function allowed(host: string): boolean {
  host = host.toLowerCase();
  if (!host.includes('.') || host === 'localhost') return false;
  if (/^\d/.test(host)) return false; // 원시 IP·수치 호스트 차단(밈 CDN은 모두 이름 도메인)
  return ALLOW.some((d) => host === d || host.endsWith('.' + d));
}

export const prerender = false;

export const GET: RequestHandler = async ({ url, fetch, setHeaders }) => {
  const target = url.searchParams.get('u');
  if (!target) throw error(400, 'missing u');

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    throw error(400, 'bad url');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw error(400, 'bad protocol');
  if (!allowed(u.hostname)) throw error(403, 'host not allowed');

  let upstream: Response;
  try {
    upstream = await fetch(u.href, {
      headers: {
        // 일부 호스트의 핫링크 차단 우회 — 자기 출처 Referer + 브라우저 UA
        'User-Agent': 'Mozilla/5.0 (compatible; memedics/1.0; +https://making-two.vercel.app)',
        Referer: `${u.protocol}//${u.host}/`,
        Accept: 'image/*,*/*;q=0.8',
      },
    });
  } catch {
    throw error(502, 'fetch failed');
  }
  if (!upstream.ok) throw error(502, `upstream ${upstream.status}`);

  const ct = upstream.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) throw error(415, 'not an image');

  const buf = await upstream.arrayBuffer();
  if (buf.byteLength > MAX) throw error(413, 'too large');

  // 원본은 잘 안 바뀌므로 길게 캐시(브라우저 하루, CDN 일주일)
  setHeaders({
    'Content-Type': ct,
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
  });
  return new Response(buf, { status: 200 });
};
