// 결과카드 캔버스용 이미지 프록시.
// 카드는 <canvas>로 그려 toBlob으로 내보내는데, 외부 호스트(imgflip·kym·naver 등)는
// CORS 헤더(Access-Control-Allow-Origin)를 안 줘서 crossOrigin 로드가 실패 → 캔버스에
// 사진이 안 실린다. 이 라우트가 서버에서 이미지를 받아 same-origin으로 되돌려주면
// 캔버스가 오염 없이 읽을 수 있다. 페이지의 <img> 표시는 직접 URL을 그대로 쓰고,
// 캔버스 렌더(share.ts)에서만 이 프록시를 탄다.
//
// SSRF 방어(허용 도메인·리다이렉트 재검사·스트리밍 크기 상한·매직바이트)는
// $lib/server/imgProxy.ts 에 있다.
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkUrl, fetchChecked, readCapped, sniffImage } from '$lib/server/imgProxy';

export const prerender = false;

export const GET: RequestHandler = async ({ url, fetch, setHeaders }) => {
  const target = url.searchParams.get('u');
  if (!target) throw error(400, 'missing u');

  const upstream = await fetchChecked(fetch, checkUrl(target));
  if (!upstream.ok) {
    await upstream.body?.cancel().catch(() => {});
    throw error(502, `upstream ${upstream.status}`);
  }

  const buf = await readCapped(upstream);

  // 상류 content-type은 신뢰하지 않는다 — 내용으로 판별하고, 내보내는 타입도 그 결과만 쓴다.
  const type = sniffImage(buf);
  if (!type) throw error(415, 'not an image');

  // 원본은 잘 안 바뀌므로 길게 캐시(브라우저 하루, CDN 일주일)
  setHeaders({
    'Content-Type': type,
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
  });
  return new Response(buf, { status: 200 });
};
