import { SAMPLE_TOPICS, type SampleTopic } from './samples';
import type { Topic } from './domain';
import { defaultLocale, type Locale } from './i18n';
import { topicTranslations } from './i18n/topics';

/**
 * 공개(샘플) 주제 = 서버가 렌더하는 SEO 대상 콘텐츠.
 * samples.ts(ko) + i18n/topics.ts(en/zh) 를 슬러그·결정적 id 를 붙인 Topic 으로 변환.
 */
export interface PublicTopic extends Topic {
	slug: string;
}

function toPublicTopic(s: SampleTopic, locale: Locale): PublicTopic {
	const slug = s.slug; // 슬러그는 데이터 자체에 있음(samples.ts). 위치결합 없음.
	// 로케일 번역 적용(en/zh). 없으면 ko 원본.
	const tr = locale === defaultLocale ? undefined : topicTranslations[slug]?.[locale];
	const title = tr?.title ?? s.title;
	const description = tr?.description ?? s.description;
	return {
		id: slug,
		slug,
		title,
		description,
		defaultMode: s.defaultMode,
		// 이름·사진이 후보 객체 한 단위에 묶여 있음 → 인덱스 병렬 배열 결합 없음.
		candidates: s.candidates.map((c, i) => ({
			id: `${slug}-${i}`,
			name: tr?.candidates?.[i] ?? c.name, // 번역 후보 있으면 사용, 없으면 원어
			image: c.image || undefined
		})),
		createdAt: 0
	};
}

const cache = new Map<Locale, PublicTopic[]>();

/** 모든 공개 주제 (로케일별) */
export function publicTopics(locale: Locale = defaultLocale): PublicTopic[] {
	let list = cache.get(locale);
	if (!list) {
		list = SAMPLE_TOPICS.map((s) => toPublicTopic(s, locale));
		cache.set(locale, list);
	}
	return list;
}

/** 슬러그로 공개 주제 하나 (로케일별) */
export function publicTopicBySlug(slug: string, locale: Locale = defaultLocale): PublicTopic | undefined {
	return publicTopics(locale).find((t) => t.slug === slug);
}

/** 이 제목이 공개(샘플) 주제인지 — localStorage 마이그레이션에서 사용(ko/번역 모두) */
export function isSampleTitle(title: string): boolean {
	if (SAMPLE_TOPICS.some((s) => s.title === title)) return true;
	for (const tr of Object.values(topicTranslations)) {
		for (const l of Object.values(tr)) if (l?.title === title) return true;
	}
	return false;
}
