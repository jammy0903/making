import { describe, it, expect } from 'vitest';
import { MergeRanker, estimateComparisons } from './mergeRanker';

interface Item {
	id: string;
	score: number; // 클수록 상위(1위)
}

function makeItems(scores: number[]): Item[] {
	return scores.map((score, k) => ({ id: `c${k}`, score }));
}

/** 알려진 정답(score 내림차순)으로 세션을 끝까지 구동하고 비교 횟수를 반환 */
function driveByScore(items: Item[]): { result: Item[]; asked: number } {
	const r = new MergeRanker(items);
	let guard = 0;
	for (let pair = r.next(); pair !== null; pair = r.next()) {
		// score 가 큰 쪽을 '위'로 선택
		r.answer(pair.a.score >= pair.b.score ? pair.a : pair.b);
		if (++guard > 100_000) throw new Error('무한 루프 방지');
	}
	const result = r.result();
	expect(result).not.toBeNull();
	return { result: result as Item[], asked: r.progress().asked };
}

function expectSortedDesc(result: Item[], input: Item[]) {
	// 1) 입력의 순열인지
	expect(result.map((x) => x.id).sort()).toEqual(input.map((x) => x.id).sort());
	// 2) score 내림차순인지 (동점 허용)
	for (let k = 1; k < result.length; k++) {
		expect(result[k - 1].score).toBeGreaterThanOrEqual(result[k].score);
	}
}

describe('MergeRanker — 정렬 정확성', () => {
	it('빈 목록은 즉시 완료, 결과 []', () => {
		const r = new MergeRanker<Item>([]);
		expect(r.next()).toBeNull();
		expect(r.result()).toEqual([]);
		expect(r.progress().done).toBe(true);
	});

	it('1개는 비교 없이 완료', () => {
		const items = makeItems([5]);
		const r = new MergeRanker(items);
		expect(r.next()).toBeNull();
		expect(r.result()).toEqual(items);
		expect(r.progress().asked).toBe(0);
	});

	it('2개는 정확히 1번 비교', () => {
		const items = makeItems([1, 9]);
		const { result, asked } = driveByScore(items);
		expect(asked).toBe(1);
		expect(result[0].score).toBe(9);
	});

	it('여러 크기에서 항상 올바르게 정렬', () => {
		for (const n of [3, 4, 5, 7, 8, 16, 17, 31, 100]) {
			const scores = Array.from({ length: n }, (_, k) => (k * 7919) % 101); // 뒤섞인 값
			const items = makeItems(scores);
			const { result } = driveByScore(items);
			expectSortedDesc(result, items);
		}
	});

	it('동점이 있어도 순열/내림차순 유지', () => {
		const items = makeItems([5, 5, 3, 5, 1, 3, 5]);
		const { result } = driveByScore(items);
		expectSortedDesc(result, items);
	});

	it('무작위 입력 다수 케이스', () => {
		for (let t = 0; t < 30; t++) {
			const n = 2 + Math.floor(Math.random() * 40);
			const items = makeItems(Array.from({ length: n }, () => Math.floor(Math.random() * 1000)));
			const { result } = driveByScore(items);
			expectSortedDesc(result, items);
		}
	});
});

describe('MergeRanker — 비교 횟수(효율)', () => {
	it('n-1 이상, 추정 상한 이하', () => {
		for (const n of [2, 3, 5, 8, 16, 32, 64, 100]) {
			const items = makeItems(Array.from({ length: n }, (_, k) => (k * 37) % 97));
			const { asked } = driveByScore(items);
			expect(asked).toBeGreaterThanOrEqual(n - 1); // 최소 비교
			expect(asked).toBeLessThanOrEqual(estimateComparisons(n)); // 추정 상한 안
			// n>=4 부터는 라운드로빈(n·(n-1)/2)보다 확실히 적어야 함
			if (n >= 4) expect(asked).toBeLessThan((n * (n - 1)) / 2);
		}
	});

	it('estimateComparisons: 0/1개는 0', () => {
		expect(estimateComparisons(0)).toBe(0);
		expect(estimateComparisons(1)).toBe(0);
	});
});

describe('MergeRanker — undo', () => {
	it('시작 시엔 undo 불가', () => {
		const r = new MergeRanker(makeItems([1, 2, 3]));
		expect(r.canUndo()).toBe(false);
	});

	it('undo 하면 직전 비교를 다시 물어봄', () => {
		const items = makeItems([3, 1, 2, 4]);
		const r = new MergeRanker(items);
		const pair1 = r.next()!;
		r.answer(pair1.a);
		expect(r.canUndo()).toBe(true);
		r.undo();
		expect(r.canUndo()).toBe(false);
		const pair2 = r.next()!;
		// 같은 쌍이 다시 나와야 함
		expect(pair2.a).toBe(pair1.a);
		expect(pair2.b).toBe(pair1.b);
		expect(r.progress().asked).toBe(0);
	});

	it('반대로 골라 undo 후 결과가 달라짐', () => {
		const build = (flip: boolean) => {
			const items = makeItems([10, 20]);
			const r = new MergeRanker(items);
			const p = r.next()!;
			r.answer(flip ? p.b : p.a);
			return r.result()![0].score;
		};
		expect(build(false)).not.toBe(build(true));
	});

	it('완료 후 undo 로 마지막 비교를 되살릴 수 있음', () => {
		const items = makeItems([5, 9]);
		const r = new MergeRanker(items);
		r.answer(r.next()!.a);
		expect(r.result()).not.toBeNull();
		r.undo();
		expect(r.result()).toBeNull();
		expect(r.next()).not.toBeNull();
	});
});

describe('MergeRanker — seed 셔플', () => {
	it('seed 를 줘도 정렬 결과는 항상 정확', () => {
		const scores = [3, 1, 4, 1, 5, 9, 2, 6];
		const items = makeItems(scores);
		const r = new MergeRanker(items, { seed: 12345 });
		for (let p = r.next(); p !== null; p = r.next()) {
			r.answer(p.a.score >= p.b.score ? p.a : p.b);
		}
		expectSortedDesc(r.result()!, items);
	});
});

describe('MergeRanker — 방어', () => {
	it('현재 쌍에 없는 winner 는 예외', () => {
		const items = makeItems([1, 2, 3, 4]);
		const r = new MergeRanker(items);
		const pair = r.next();
		expect(pair).not.toBeNull();
		const outsider: Item = { id: 'x', score: 99 };
		expect(() => r.answer(outsider)).toThrow();
	});

	it('next 없이 answer 하면 예외 (완료 상태)', () => {
		const r = new MergeRanker<Item>([]);
		expect(() => r.answer({ id: 'x', score: 1 })).toThrow();
	});
});
