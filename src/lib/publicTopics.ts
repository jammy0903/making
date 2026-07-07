import { SAMPLE_TOPICS } from './samples';
import type { Topic } from './domain';

/**
 * 공개(샘플) 주제 = 서버가 렌더하는 SEO 대상 콘텐츠.
 * samples.ts 를 슬러그·결정적 id 를 붙인 Topic 으로 변환한다.
 * localStorage 와 달리 서버에서 읽히므로 크롤러가 실제 콘텐츠를 본다.
 */
export interface PublicTopic extends Topic {
	slug: string;
}

/**
 * ASCII 슬러그 (SAMPLE_TOPICS 순서와 1:1). 한글 슬러그는 %인코딩돼 지저분하고 로케일-종속이라
 * 로케일 무관한 ASCII 키워드 슬러그를 수기 지정한다(SEO·공유 친화).
 */
const SLUGS: string[] = [
	'girl-idol',
	'boy-idol',
	'actress',
	'actor',
	'anime-girl',
	'anime-boy',
	'best-food',
	'ramen',
	'convenience-store-food',
	'bunsik',
	'delivery-food',
	'korean-stew',
	'gukbap',
	'world-food',
	'chicken-menu',
	'chicken-brand',
	'korean-snack',
	'ice-cream',
	'dessert',
	'bread',
	'street-food',
	'rice-cake',
	'cafe-drink',
	'soda',
	'alcohol',
	'fruit',
	'baby-animal',
	'pet',
	'travel-destination',
	'mbti',
	'season'
];

function toPublicTopic(index: number): PublicTopic {
	const s = SAMPLE_TOPICS[index];
	const slug = SLUGS[index] ?? `topic-${index}`;
	return {
		id: slug, // 슬러그를 id 로 사용(결정적)
		slug,
		title: s.title,
		description: s.description,
		defaultMode: s.defaultMode,
		candidates: s.candidates.map((name, i) => ({
			id: `${slug}-${i}`,
			name,
			image: s.images?.[i] || undefined
		})),
		createdAt: 0
	};
}

let cache: PublicTopic[] | null = null;

/** 모든 공개 주제 */
export function publicTopics(): PublicTopic[] {
	if (!cache) cache = SAMPLE_TOPICS.map((_, i) => toPublicTopic(i));
	return cache;
}

/** 슬러그로 공개 주제 하나 */
export function publicTopicBySlug(slug: string): PublicTopic | undefined {
	return publicTopics().find((t) => t.slug === slug);
}

/** 이 제목이 공개(샘플) 주제인지 — localStorage 마이그레이션에서 사용 */
export function isSampleTitle(title: string): boolean {
	return SAMPLE_TOPICS.some((s) => s.title === title);
}
