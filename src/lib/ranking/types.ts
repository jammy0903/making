/** 순위 매기기 공통 타입 */

/** 순위를 매길 대상 하나(후보). 엔진은 내용에 관여하지 않고 참조만 다룬다. */
export interface Candidate {
	id: string;
	name: string;
	image?: string;
}

/** 순위 산출 모드: 둘씩 비교(sort) · 드래그 배치(drag) */
export type RankMode = 'sort' | 'drag';

/** 다음에 물어볼 한 쌍 */
export interface Pair<T> {
	a: T;
	b: T;
}

/** 진행 상황. estimatedTotal 은 추정치(정확한 값 아님) */
export interface Progress {
	asked: number;
	estimatedTotal: number;
	done: boolean;
}

/**
 * 비교 기반 순위 세션 공통 인터페이스.
 * 화면은 next() 로 받은 쌍을 보여주고, 사용자가 고른 쪽을 answer() 로 넘긴다.
 * 완료되면 result() 가 1위→N위 순서의 배열을 돌려준다.
 */
export interface RankSession<T> {
	/** 다음에 비교할 쌍. 더 물어볼 게 없으면 null */
	next(): Pair<T> | null;
	/** 사용자가 '위'로 고른 항목을 반영 */
	answer(winner: T): void;
	progress(): Progress;
	/** 완료 시 순위 배열(1위가 앞), 진행 중이면 null */
	result(): T[] | null;
}
