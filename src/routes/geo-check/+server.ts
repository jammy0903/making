// 임시 진단용 — Vercel이 요청 IP를 무슨 국가로 보는지 반환. 확인 후 삭제.
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) =>
  new Response(request.headers.get('x-vercel-ip-country') || 'none', {
    headers: { 'content-type': 'text/plain' },
  });
