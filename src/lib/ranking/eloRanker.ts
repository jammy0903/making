import type { Pair, Progress, RankSession } from './types';

/**
 * Elo 온라인 레이팅 기반 순위 세션 (설계서 §5-1, growth-plan §5-1·§5-5).
 *
 * 병합정렬과 달리 **추이성을 가정하지 않는다.** 매 선택을 승/패로 보고 두 후보의
 * 레이팅을 증분 갱신하며, 다음 쌍은 **레이팅이 가장 비슷한(=예측 불가한) 후보끼리**
 * 뽑는다(적응형 매치업). 사용자에겐 "계속 고민되는 매치업만 나온다"는 재미가 되고,
 * 엔진은 (a) 비교 횟수에 비례한 신뢰도, (b) 점수(레이팅)→상위%·강도, (c) 순환 취향
 * 탐지(§5-2)의 기반을 얻는다. 병합정렬은 모순 쌍을 아예 안 물어 순환을 구조적으로
 * 탐지할 수 없다 — 그래서 엔진을 교체한다.
 *
 * **반응시간 되먹임(§5-5):** answer 에 확신도(빠른 선택=1, 고뇌=0)를 주면
 *  (1) 확신이 클수록 레이팅을 크게 갱신(정보량 반영), (2) 세션 평균 확신이 높으면
 *  목표 비교 횟수 자체를 줄인다 → **결단력 있는 사람은 더 적게 비교하고 끝난다.**
 *
 * answer(winner) 의 winner 는 직전 next() 가 준 쌍의 한 항목이어야 하며 참조(===)로
 * 판별한다. 후보는 고유 객체 참조로 넘길 것.
 */

export interface EloRankerOptions {
	/** 주어지면 초기 후보 순서를 이 seed 로 섞는다(동률 타이브레이크가 매번 같지 않게). */
	seed?: number;
	/** 초기 레이팅. 기본 1500. */
	initialRating?: number;
	/** K-factor(한 판당 레이팅 변동 폭). 기본 32. */
	k?: number;
	/** 기본(=상한) 목표 비교 횟수. 미지정 시 defaultEloTarget. */
	targetComparisons?: number;
	/**
	 * 확신도로 줄일 수 있는 목표의 최대 비율(0~1, §5-5). 세션 평균 확신이 1이면 목표를
	 * `target·(1-saving)` 까지 낮춘다(결단력 있는 사용자 = 더 적은 비교). 기본 0.35.
	 * 0 이면 반응시간이 횟수에 영향 없음(항상 target).
	 */
	confidenceSaving?: number;
}

/**
 * 반응시간(ms)을 확신도 0~1 로 변환(§5-5). 빠를수록 확신(1), 오래 고민할수록 낮음(→0.1).
 * 0 밑으로는 안 내려 최소한의 레이팅 갱신은 유지한다.
 */
export function confidenceFromReactionMs(ms: number): number {
	const FAST = 1000; // 이 이하는 즉답(확신 1)
	const SLOW = 7000; // 이 이상은 고뇌(확신 하한)
	const c = (SLOW - ms) / (SLOW - FAST);
	return Math.max(0.1, Math.min(1, c));
}

/** undo 용 로그 한 줄. 갱신 전 레이팅·확신을 담아 되돌릴 수 있게 한다. */
interface LogEntry {
	winner: number; // 후보 인덱스
	loser: number;
	wBefore: number; // 갱신 전 winner 레이팅
	lBefore: number; // 갱신 전 loser 레이팅
	conf: number; // 이 판의 확신도(undo 시 평균에서 차감)
}

/** 외부 랜덤 의존 없이 seed 로 결정적으로 섞기(LCG) — mergeRanker 와 동일 방식. */
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

/**
 * 기본 목표 비교 횟수. 후보 1명이 대략 (log₂N + 1) 판을 치르는 분량:
 *   총 = N·(⌈log₂N⌉+1)/2.
 * N·log₂N(과다, 10명이면 34판) 보다 가볍게 잡아 피로도를 줄인다(10명 ≈ 25판 →
 * 병합정렬 체감과 비슷). 순위 정확도와 클릭 수의 절충 — 필요하면 targetComparisons 로 조정.
 */
export function defaultEloTarget(n: number): number {
	if (n <= 1) return 0;
	const roundsPerCandidate = Math.ceil(Math.log2(n)) + 1;
	return Math.max(n - 1, Math.ceil((n * roundsPerCandidate) / 2));
}

export class EloRanker<T> implements RankSession<T> {
	private readonly items: T[]; // 셔플된 순서. 이후 인덱스로만 상태를 다룬다.
	private readonly rating: number[]; // 인덱스별 레이팅
	private readonly count: number[]; // 인덱스별 비교 횟수
	private readonly k: number;
	private readonly baseTarget: number;
	private readonly saving: number;
	private asked = 0;
	private sumConf = 0; // 확신도 누적(평균 = sumConf/asked)
	private log: LogEntry[] = [];
	private current: { i: number; j: number } | null = null; // 직전 next() 가 고른 쌍
	private lastPair: [number, number] | null = null; // 즉시 같은 쌍 반복 완화용

	constructor(items: readonly T[], opts: EloRankerOptions = {}) {
		this.items = opts.seed !== undefined ? shuffle(items, opts.seed) : items.slice();
		const n = this.items.length;
		this.rating = new Array<number>(n).fill(opts.initialRating ?? 1500);
		this.count = new Array<number>(n).fill(0);
		this.k = opts.k ?? 32;
		this.baseTarget = opts.targetComparisons ?? defaultEloTarget(n);
		this.saving = Math.max(0, Math.min(1, opts.confidenceSaving ?? 0.35));
	}

	next(): Pair<T> | null {
		if (this.isDone()) {
			this.current = null;
			return null;
		}
		const pick = this.selectPair();
		this.current = pick;
		return pick ? { a: this.items[pick.i], b: this.items[pick.j] } : null;
	}

	/**
	 * @param winner 직전 next() 쌍에서 사용자가 고른 항목
	 * @param confidence 확신도 0~1(반응시간 기반, §5-5). 높을수록 레이팅을 크게 갱신하고,
	 *   세션 평균이 높으면 목표 비교 횟수를 줄인다. 미지정 시 0.5(중립).
	 */
	answer(winner: T, confidence = 0.5): void {
		if (!this.current) throw new Error('비교할 쌍이 없습니다 (answer 전에 next 확인).');
		const { i, j } = this.current;
		const winnerIsI = this.items[i] === winner;
		const winnerIsJ = this.items[j] === winner;
		if (!winnerIsI && !winnerIsJ) throw new Error('winner 가 현재 비교 쌍에 없습니다.');

		const w = winnerIsI ? i : j;
		const l = winnerIsI ? j : i;
		const wBefore = this.rating[w];
		const lBefore = this.rating[l];
		const conf = Math.max(0, Math.min(1, confidence));

		// 확신도로 K 를 가중: 중립(0.5)=k, 즉답(1)=1.5k, 고뇌(0)=0.5k.
		const kEff = this.k * (0.5 + conf);
		// Elo 갱신(제로섬): winner 가 얻는 만큼 loser 가 잃는다.
		const expW = 1 / (1 + Math.pow(10, (lBefore - wBefore) / 400)); // winner 승리 기대확률
		const delta = kEff * (1 - expW);
		this.rating[w] = wBefore + delta;
		this.rating[l] = lBefore - delta;
		this.count[w] += 1;
		this.count[l] += 1;
		this.asked += 1;
		this.sumConf += conf;

		this.log.push({ winner: w, loser: l, wBefore, lBefore, conf });
		this.lastPair = [Math.min(i, j), Math.max(i, j)];
		this.current = null;
	}

	progress(): Progress {
		// estimatedTotal 은 진행바용 기준값(상한). 확신 높으면 이보다 일찍 끝난다.
		return { asked: this.asked, estimatedTotal: this.baseTarget, done: this.isDone() };
	}

	result(): T[] | null {
		return this.isDone() ? this.standingsOrder().map((k) => this.items[k]) : null;
	}

	/** 되돌릴 이전 선택이 있는가 */
	canUndo(): boolean {
		return this.log.length > 0;
	}

	/** 직전 선택을 취소하고 레이팅·카운트·확신누적을 그 이전으로 되돌린다. */
	undo(): void {
		const e = this.log.pop();
		if (!e) return;
		this.rating[e.winner] = e.wBefore;
		this.rating[e.loser] = e.lBefore;
		this.count[e.winner] -= 1;
		this.count[e.loser] -= 1;
		this.asked -= 1;
		this.sumConf -= e.conf;
		this.current = null;
		const prev = this.log[this.log.length - 1];
		this.lastPair = prev
			? [Math.min(prev.winner, prev.loser), Math.max(prev.winner, prev.loser)]
			: null;
	}

	// ---- 다운스트림용(§5-2 순환 탐지·통계·결과 카드). RankSession 인터페이스 밖. ----

	/** 지금까지의 비교 로그(승자→패자). 순환 탐지·W 폴딩에 사용. */
	comparisons(): Array<{ winner: T; loser: T }> {
		return this.log.map((e) => ({ winner: this.items[e.winner], loser: this.items[e.loser] }));
	}

	/** 현재 순위표(1위→N위) + 레이팅·비교횟수. 결과 화면/점수 표시용. */
	standings(): Array<{ item: T; rating: number; comparisons: number }> {
		return this.standingsOrder().map((k) => ({
			item: this.items[k],
			rating: this.rating[k],
			comparisons: this.count[k]
		}));
	}

	// ---- 내부 ----

	private isDone(): boolean {
		return this.asked >= this.effectiveTarget();
	}

	/**
	 * 확신도로 조정된 목표 비교 횟수(§5-5). 세션 평균 확신이 높을수록 목표를 낮춘다:
	 *   target·(1 − saving·avgConf), 최소 N-1. 확신 정보가 없으면(avgConf=0.5) 중간.
	 */
	private effectiveTarget(): number {
		const n = this.items.length;
		if (n <= 1) return 0;
		const avgConf = this.asked > 0 ? this.sumConf / this.asked : 0.5;
		const eff = Math.round(this.baseTarget * (1 - this.saving * avgConf));
		return Math.max(n - 1, eff);
	}

	/** 레이팅 내림차순 인덱스 순서(동률은 원래 인덱스순으로 안정 정렬). */
	private standingsOrder(): number[] {
		return this.items.map((_, k) => k).sort((a, b) => this.rating[b] - this.rating[a] || a - b);
	}

	/**
	 * 다음에 물어볼 쌍 — **현재 순위에서 인접한(=경계가 불확실한) 쌍** 중 하나.
	 * 인접쌍만 비교하면 (a) 가장 헷갈리는 경계를 우선 해소해 순위가 빨리 수렴하고,
	 * (b) 사용자에겐 "계속 고민되는 매치업만 나온다"는 재미가 된다.
	 *   - 1순위: 레이팅 격차가 가장 작은 인접쌍(가장 불확실).
	 *   - 동률(초기엔 전부 0): 덜 비교된 쌍(커버리지 확보).
	 *   - 직전과 똑같은 쌍은 건너뛴다(연속 반복 완화). N=2 라 대안이 없으면 그대로.
	 */
	private selectPair(): { i: number; j: number } | null {
		const n = this.items.length;
		if (n < 2) return null;
		const order = this.standingsOrder(); // 레이팅 내림차순

		let best: { i: number; j: number } | null = null;
		let bestGap = Infinity;
		let bestCount = Infinity;
		for (let p = 0; p < n - 1; p++) {
			const a = order[p];
			const b = order[p + 1];
			const isRepeat =
				this.lastPair &&
				Math.min(a, b) === this.lastPair[0] &&
				Math.max(a, b) === this.lastPair[1];
			if (isRepeat) continue; // 직전 쌍 회피(대안이 있으면)
			const gap = this.rating[a] - this.rating[b]; // 정렬돼 있어 ≥ 0
			const cs = this.count[a] + this.count[b];
			if (gap < bestGap - 1e-9 || (Math.abs(gap - bestGap) <= 1e-9 && cs < bestCount)) {
				bestGap = gap;
				bestCount = cs;
				best = { i: a, j: b };
			}
		}
		// 인접쌍이 직전 쌍 하나뿐(N=2) → 그대로 반복
		return best ?? { i: order[0], j: order[1] };
	}
}
