import type { Pair, Progress, RankSession } from './types';

export interface MergeRankerOptions {
	/** 주어지면 초기 대진 순서를 이 seed 로 섞는다(매번 같은 순서가 나오지 않게). */
	seed?: number;
}

/** 외부 랜덤 의존 없이 seed 로 결정적으로 섞기(LCG). */
function shuffle<T>(arr: readonly T[], seed: number): T[] {
	const a = arr.slice();
	let s = seed >>> 0 || 1;
	for (let i = a.length - 1; i > 0; i--) {
		s = (s * 1664525 + 1013904223) >>> 0;
		const j = s % (i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** undo 용 상태 스냅샷 */
interface Snapshot<T> {
	runs: T[][];
	nextRuns: T[][];
	runIdx: number;
	A: T[] | null;
	B: T[] | null;
	i: number;
	j: number;
	out: T[];
	asked: number;
	sorted: T[] | null;
}

/**
 * 인터랙티브 병합 정렬(bottom-up).
 *
 * "둘 중 누가 위?" 라는 비교 판단을 사람이 대신하는 정렬 세션.
 * - 화면은 next() 로 받은 쌍을 보여주고, 사용자가 고른 쪽을 answer() 로 넘긴다.
 * - 병합 정렬은 정렬된 런(run)의 맨 앞끼리만 비교하므로, 이미 순서가 정해진
 *   관계는 다시 묻지 않는다(추이성: A>B, B>C ⇒ A>C 자동). 이게 효율의 핵심.
 * - 비교 횟수는 약 n·log₂(n) (16개 ≈ 32회).
 *
 * answer(winner) 의 winner 는 현재 next() 가 준 a/b 중 하나여야 하며,
 * 참조 동일성(===)으로 판별한다. 후보는 고유 객체 참조로 넘길 것.
 */
export class MergeRanker<T> implements RankSession<T> {
	private runs: T[][]; // 현재 패스의 정렬된 런 목록
	private nextRuns: T[][] = []; // 다음 패스로 넘길 병합 결과
	private runIdx = 0; // 현재 패스에서 다음에 짝지을 런 위치

	// 진행 중인 병합 상태
	private A: T[] | null = null;
	private B: T[] | null = null;
	private i = 0;
	private j = 0;
	private out: T[] = [];

	private asked = 0;
	private sorted: T[] | null = null; // 완료 시 최종 순위
	private history: Snapshot<T>[] = []; // undo 스택
	private readonly estimatedTotal: number;

	constructor(items: readonly T[], opts: MergeRankerOptions = {}) {
		const ordered = opts.seed !== undefined ? shuffle(items, opts.seed) : items.slice();
		this.runs = ordered.map((x) => [x]); // 각 항목을 길이 1 런으로 시작
		this.estimatedTotal = estimateComparisons(items.length);
		// 0~1개면 비교 없이 즉시 완료
		if (items.length <= 1) {
			this.sorted = ordered.slice();
		}
	}

	next(): Pair<T> | null {
		if (this.sorted) return null;
		if (!this.ensureActiveMerge()) return null;
		// ensureActiveMerge 가 true 면 A/B 와 i/j 는 유효
		return { a: this.A![this.i], b: this.B![this.j] };
	}

	answer(winner: T): void {
		if (!this.A || !this.B) throw new Error('비교할 쌍이 없습니다 (answer 전에 next 확인).');
		const a = this.A[this.i];
		const b = this.B[this.j];
		if (winner !== a && winner !== b) throw new Error('winner 가 현재 비교 쌍에 없습니다.');

		this.history.push(this.snapshot()); // undo 를 위해 답하기 직전 상태 저장
		this.asked += 1;

		if (winner === a) {
			this.out.push(a);
			this.i += 1;
		} else {
			this.out.push(b);
			this.j += 1;
		}

		// 한쪽 런이 소진되면 남은 쪽을 이어 붙이고 이 병합을 종료
		if (this.i >= this.A.length) {
			while (this.j < this.B.length) this.out.push(this.B[this.j++]);
			this.finishMerge();
		} else if (this.j >= this.B.length) {
			while (this.i < this.A.length) this.out.push(this.A[this.i++]);
			this.finishMerge();
		}

		// 다음 비교(또는 완료)까지 상태를 정착시켜 result()/progress() 가 바로 정확해지게 함
		this.ensureActiveMerge();
	}

	progress(): Progress {
		return { asked: this.asked, estimatedTotal: this.estimatedTotal, done: this.sorted !== null };
	}

	result(): T[] | null {
		return this.sorted ? this.sorted.slice() : null;
	}

	/** 되돌릴 이전 선택이 있는가 */
	canUndo(): boolean {
		return this.history.length > 0;
	}

	/** 직전 선택을 취소하고 그 비교를 다시 물어볼 수 있는 상태로 되돌린다. */
	undo(): void {
		const s = this.history.pop();
		if (!s) return;
		this.runs = s.runs;
		this.nextRuns = s.nextRuns;
		this.runIdx = s.runIdx;
		this.A = s.A;
		this.B = s.B;
		this.i = s.i;
		this.j = s.j;
		this.out = s.out;
		this.asked = s.asked;
		this.sorted = s.sorted;
	}

	// ---- 내부 ----

	private snapshot(): Snapshot<T> {
		const copyRuns = (rs: T[][]) => rs.map((r) => r.slice());
		// A/B/out 은 병합 중 in-place 변경되지 않으므로 얕은 복사로 충분
		return {
			runs: copyRuns(this.runs),
			nextRuns: copyRuns(this.nextRuns),
			runIdx: this.runIdx,
			A: this.A ? this.A.slice() : null,
			B: this.B ? this.B.slice() : null,
			i: this.i,
			j: this.j,
			out: this.out.slice(),
			asked: this.asked,
			sorted: this.sorted ? this.sorted.slice() : null
		};
	}

	private finishMerge(): void {
		this.nextRuns.push(this.out);
		this.A = null;
		this.B = null;
		this.out = [];
	}

	/**
	 * 비교가 필요한 활성 병합이 준비되도록 상태를 전진시킨다.
	 * true: 물어볼 쌍이 있음. false: 정렬 완료(sorted 세팅됨).
	 */
	private ensureActiveMerge(): boolean {
		// 이미 진행 중인 병합에 물어볼 게 남아 있으면 그대로 사용
		if (this.A && this.B && this.i < this.A.length && this.j < this.B.length) return true;

		while (true) {
			if (this.runIdx >= this.runs.length) {
				// 현재 패스 종료
				if (this.nextRuns.length <= 1) {
					// 병합할 게 없음 → 정렬 완료
					this.sorted = this.nextRuns.length === 1 ? this.nextRuns[0].slice() : [];
					this.nextRuns = [];
					return false;
				}
				// 다음 패스 시작
				this.runs = this.nextRuns;
				this.nextRuns = [];
				this.runIdx = 0;
			}

			const A = this.runs[this.runIdx];
			const B = this.runs[this.runIdx + 1];
			if (B === undefined) {
				// 짝 없는 런은 다음 패스로 그대로 승계
				this.nextRuns.push(A);
				this.runIdx += 1;
				continue;
			}
			// 새 병합 시작
			this.A = A;
			this.B = B;
			this.i = 0;
			this.j = 0;
			this.out = [];
			this.runIdx += 2;
			return true;
		}
	}
}

/**
 * bottom-up 병합 정렬의 대략적인 비교 횟수 추정(진행률 표시용, 정확값 아님).
 * 각 패스마다 최대 n-1 회 비교, 패스 수는 ceil(log2 n).
 */
export function estimateComparisons(n: number): number {
	if (n <= 1) return 0;
	const passes = Math.ceil(Math.log2(n));
	return passes * (n - 1);
}
