import { publicTopics } from '$lib/publicTopics';
import { defaultLocale, type Locale } from '$lib/i18n';

/**
 * 홈 SSR 데이터 — 로케일별 공개(샘플) 주제 목록을 서버가 렌더.
 * 클라이언트는 여기에 localStorage 의 사용자 생성 주제를 얹는다.
 */
export function load({ params }) {
	const locale = (params.lang as Locale) ?? defaultLocale;
	return {
		samples: publicTopics(locale).map((t) => ({
			slug: t.slug,
			title: t.title,
			description: t.description,
			defaultMode: t.defaultMode,
			count: t.candidates.length,
			cover: t.candidates.find((c) => c.image)?.image ?? null
		}))
	};
}
