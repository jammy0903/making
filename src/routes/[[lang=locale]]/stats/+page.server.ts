/**
 * 공개 통계 페이지(누구나 열람). 집계는 서버에서 service_role로만(원본 플레이 행 미노출).
 */
import { loadDeckStats } from '$lib/server/statsRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	// 공개 페이지 — 매 방문 전체 집계 부담을 줄이려 60초 캐시(통계는 실시간일 필요 없음).
	setHeaders({ 'cache-control': 'public, max-age=60' });
	return await loadDeckStats();
};
