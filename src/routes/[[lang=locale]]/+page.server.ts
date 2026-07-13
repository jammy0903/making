import type { PageServerLoad } from './$types';

// 공감 리그 홈 — 리그 목록/랭킹 데이터는 여기서 로드한다(설계문서 v4 §3-1).
// 아직 스키마 미구현 → 빈 로드.
export const load: PageServerLoad = async () => {
	return {};
};
