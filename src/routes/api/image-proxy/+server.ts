/**
 * GET /api/image-proxy?url=<이미지URL> — 원격 이미지를 서버에서 받아 그대로 되돌려준다.
 *
 * 브라우저는 검색 결과의 외부 이미지 URL 을 CORS·핫링크 차단 때문에 직접 못 읽는다.
 * 서버가 대신 받아(UA 지정) 바이트를 넘겨주면, 클라이언트가 리사이즈해 data URL 로 저장할 수 있다.
 *
 * ⚠️ SSRF 방지를 위해 http(s) + 이미지 content-type 만 허용한다.
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

export const GET: RequestHandler = async ({ url }) => {
	const target = url.searchParams.get('url');
	if (!target) throw error(400, 'url 파라미터가 필요합니다.');

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		throw error(400, '올바른 URL 이 아닙니다.');
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw error(400, 'http(s) URL 만 허용됩니다.');
	}

	let res: Response;
	try {
		res = await fetch(parsed, {
			headers: { 'User-Agent': UA, Referer: `${parsed.protocol}//${parsed.host}/` },
			signal: AbortSignal.timeout(15000)
		});
	} catch {
		throw error(502, '이미지를 가져오지 못했습니다 (호스트 접속 실패).');
	}
	if (!res.ok) throw error(502, `이미지 원본 오류: HTTP ${res.status}`);

	const contentType = res.headers.get('content-type') ?? '';
	if (!contentType.startsWith('image/')) {
		throw error(415, `이미지가 아닙니다 (${contentType || '알 수 없음'}).`);
	}

	const buf = await res.arrayBuffer();
	return new Response(buf, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
