import type { Candidate, RankMode } from './ranking/types';

export type { Candidate, RankMode };

/** 하나의 주제(이상형 순위 월드컵). 1단계에서는 localStorage 에만 저장. */
export interface Topic {
	id: string;
	title: string;
	description: string;
	defaultMode: RankMode;
	candidates: Candidate[];
	createdAt: number;
}

/** 간단한 고유 id 생성(브라우저 crypto 우선, 폴백은 시간+랜덤). */
export function makeId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 주제가 플레이 가능한 최소 조건: 후보 2개 이상 */
export function isPlayable(topic: Topic): boolean {
	return topic.candidates.length >= 2;
}
