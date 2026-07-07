import { publicTopics } from '$lib/publicTopics';

/**
 * 홈 SSR 데이터 — 공개(샘플) 주제 목록을 서버가 렌더해 크롤러가 콘텐츠를 보게 한다.
 * 클라이언트는 여기에 localStorage 의 사용자 생성 주제를 얹는다.
 */
export function load() {
	return {
		samples: publicTopics().map((t) => ({
			slug: t.slug,
			title: t.title,
			description: t.description,
			defaultMode: t.defaultMode,
			count: t.candidates.length,
			cover: t.candidates.find((c) => c.image)?.image ?? null
		}))
	};
}
