/**
 * GET /api/image-search?q=검색어&count=20 — 이미지 검색 (Bing, API 키 불필요).
 *
 * 응답: { results: ImageResult[] }
 */
import { json, error } from '@sveltejs/kit';
import { searchImages, type ImageSearchOptions } from '$lib/server/bingImageSearch';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) throw error(400, '검색어(q)가 필요합니다.');

	const opts: ImageSearchOptions = {};
	const count = url.searchParams.get('count');
	const safe = url.searchParams.get('safe');
	if (count) {
		const n = Number(count);
		if (Number.isFinite(n) && n > 0) opts.count = Math.min(Math.floor(n), 50);
	}
	if (safe === 'off' || safe === 'moderate' || safe === 'strict') opts.safe = safe;

	try {
		const results = await searchImages(q, opts);
		return json({ results });
	} catch (e) {
		// 원문 에러(엔드포인트·토큰 상태 등)는 서버 로그로만, 외부엔 일반 메시지
		console.error('[image-search] 검색 실패:', e);
		throw error(502, '이미지 검색에 실패했습니다.');
	}
};
