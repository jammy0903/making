import { browser } from '$app/environment';
import type { Topic } from './domain';

/**
 * 1단계 로컬 저장소. 브라우저 localStorage 에 주제 목록을 보관한다.
 * (2단계에서 Supabase 어댑터로 교체 예정 — 인터페이스는 이 모듈로 유지)
 */
const KEY = 'jn:topics';

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
