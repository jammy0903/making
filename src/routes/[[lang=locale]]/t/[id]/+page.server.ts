import { publicTopicBySlug } from '$lib/publicTopics';
import { defaultLocale, type Locale } from '$lib/i18n';

/**
 * 주제 SSR 데이터.
 * - 슬러그가 공개(샘플) 주제와 일치하면 서버가 전체 주제를 렌더(크롤러가 콘텐츠·후보를 봄).
 * - 아니면(사용자 uuid 주제) null → 클라이언트가 localStorage 에서 로드.
 */
export function load({ params, setHeaders }) {
	const locale = (params.lang as Locale) ?? defaultLocale;
	const topic = publicTopicBySlug(params.id, locale) ?? null;
	// 공개 주제가 아니면(사용자 uuid 주제 등) 크롤러가 색인하지 않게 → soft-404 방지
	if (!topic) {
		setHeaders({ 'X-Robots-Tag': 'noindex' });
	}
	return { topic };
}
