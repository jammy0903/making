import { browser } from '$app/environment';
import type { Topic } from './domain';
import { publicTopicBySlug, isSampleTitle } from './publicTopics';
import { defaultLocale, type Locale } from './i18n';

/**
 * 로컬 저장소 — 이제 **사용자가 만든 주제만** 보관한다.
 * 공개(샘플) 주제는 서버 렌더(publicTopics)로 승격됐다 → SEO 대상.
 * (2단계에서 Supabase 어댑터로 교체 예정)
 */
const KEY = 'jn:topics';
const PRUNED_KEY = 'jn:pruned_samples';

function readAll(): Topic[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as Topic[]) : [];
	} catch {
		console.warn('[storage] 주제 목록을 읽지 못했습니다. 빈 목록으로 시작합니다.');
		return [];
	}
}

function writeAll(topics: Topic[]): void {
	if (!browser) return;
	localStorage.setItem(KEY, JSON.stringify(topics));
}

/**
 * 예전 버전에서 localStorage 에 심겼던 샘플 주제를 1회 제거한다.
 * (이제 샘플은 서버가 렌더 → 중복 방지. 사용자가 만든 주제는 유지)
 */
export function pruneSeededSamples(): void {
	if (!browser) return;
	if (localStorage.getItem(PRUNED_KEY)) return;
	writeAll(readAll().filter((t) => !isSampleTitle(t.title)));
	localStorage.setItem(PRUNED_KEY, '1');
}

/** 사용자가 만든 주제만(샘플 제외), 최신순 */
export function listUserTopics(): Topic[] {
	return readAll()
		.filter((t) => !isSampleTitle(t.title))
		.sort((a, b) => b.createdAt - a.createdAt);
}

/** 슬러그면 공개 주제(로케일별), 아니면 localStorage 사용자 주제 */
export function getTopic(id: string, locale: Locale = defaultLocale): Topic | undefined {
	return publicTopicBySlug(id, locale) ?? readAll().find((t) => t.id === id);
}

export function saveTopic(topic: Topic): void {
	const all = readAll();
	const idx = all.findIndex((t) => t.id === topic.id);
	if (idx >= 0) all[idx] = topic;
	else all.push(topic);
	writeAll(all);
}

export function deleteTopic(id: string): void {
	writeAll(readAll().filter((t) => t.id !== id));
}
