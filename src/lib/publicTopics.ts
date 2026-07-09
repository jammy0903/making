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
	// 후보[]↔이미지[] 인덱스 결합 안전장치: 개수 불일치를 조용히 넘기지 않고 드러낸다.
	if (s.images && s.images.length !== s.candidates.length) {
		console.warn(
			`[publicTopics] '${slug}' 후보(${s.candidates.length})와 이미지(${s.images.length}) 개수 불일치 — 인덱스 정합을 확인하세요.`
		);
	}
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
		candidates: s.candidates.map((name, i) => ({
			id: `${slug}-${i}`,
			name: tr?.candidates?.[i] ?? name, // 번역 후보 있으면 사용, 없으면 원어
			image: s.images?.[i] || undefined
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
