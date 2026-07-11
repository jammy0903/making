/**
 * 내 결과를 브라우저 localStorage에 저장(영구 아님 — 캐시 지우면 사라짐).
 * 결과 재현에 필요한 건 덱ID + 선택 시퀀스뿐(결정론적). 최근 30개만 유지.
 */
import type { SideIndex } from './engine';

const KEY = 'geuronde_results';
const MAX = 30;

export interface SavedResult {
	deckId: string;
	/** 선택 시퀀스('0'/'1' 5~10자리 인코딩, v3.1 가변 길이) */
	code: string;
	/** 저장 시각(ms) */
	ts: number;
}

export function loadResults(): SavedResult[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const arr = JSON.parse(raw);
		return Array.isArray(arr) ? arr : [];
	} catch {
		return [];
	}
}

/** 결과 저장(같은 덱+같은 선택이면 시각만 갱신). 최신이 앞. */
export function saveResult(deckId: string, code: string): void {
	if (typeof localStorage === 'undefined' || !/^[01]{5,10}$/.test(code)) return;
	try {
		const list = loadResults().filter((r) => !(r.deckId === deckId && r.code === code));
		list.unshift({ deckId, code, ts: Date.now() });
		localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
	} catch {
		// 저장 실패는 조용히 무시 — 부수기능일 뿐.
	}
}

export function choicesToCode(choices: SideIndex[]): string {
	return choices.map((c) => (c === 0 ? '0' : '1')).join('');
}
