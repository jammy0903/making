import { browser } from '$app/environment';
import { makeId, type Topic } from './domain';
import { SAMPLE_TOPICS } from './samples';

/**
 * 1단계 로컬 저장소. 브라우저 localStorage 에 주제 목록을 보관한다.
 * (2단계에서 Supabase 어댑터로 교체 예정 — 인터페이스는 이 모듈로 유지)
 */
const KEY = 'jn:topics';
const SAMPLES_VERSION_KEY = 'jn:samples_version';
const SAMPLES_VERSION = '2'; // 이 값이 바뀌면 기존 주제를 지우고 새 샘플로 교체

function readAll(): Topic[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as Topic[]) : [];
	} catch {
		// 손상된 데이터는 조용히 삼키지 않고 빈 목록으로 시작하되 경고를 남긴다
		console.warn('[storage] 주제 목록을 읽지 못했습니다. 빈 목록으로 시작합니다.');
		return [];
	}
}

function writeAll(topics: Topic[]): void {
	if (!browser) return;
	localStorage.setItem(KEY, JSON.stringify(topics));
}

/**
 * 샘플 주제 버전이 바뀌면 기존 주제를 모두 지우고 새 샘플 세트로 교체한다.
 * (같은 버전에서는 한 번만 심고, 이후 사용자의 편집/삭제는 유지된다)
 */
export function seedSamplesIfNeeded(): void {
	if (!browser) return;
	if (localStorage.getItem(SAMPLES_VERSION_KEY) === SAMPLES_VERSION) return;
	const now = Date.now();
	const topics: Topic[] = SAMPLE_TOPICS.map((s, i) => ({
		id: makeId(),
		title: s.title,
		description: s.description,
		defaultMode: s.defaultMode,
		candidates: s.candidates.map((name) => ({ id: makeId(), name })),
		createdAt: now - i * 1000 // 목록에서 정의한 순서대로 보이도록
	}));
	writeAll(topics); // 기존 주제를 새 세트로 완전히 교체
	localStorage.setItem(SAMPLES_VERSION_KEY, SAMPLES_VERSION);
}

export function listTopics(): Topic[] {
	return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getTopic(id: string): Topic | undefined {
	return readAll().find((t) => t.id === id);
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
