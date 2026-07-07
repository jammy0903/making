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
	if (count) opts.count = Number(count);
	if (safe === 'off' || safe === 'moderate' || safe === 'strict') opts.safe = safe;

	try {
		const results = await searchImages(q, opts);
		return json({ results });
	} catch (e) {
		const message = e instanceof Error ? e.message : '알 수 없는 오류';
		throw error(502, message);
	}
};
