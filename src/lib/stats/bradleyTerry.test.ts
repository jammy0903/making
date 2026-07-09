import { describe, it, expect } from 'vitest';
import {
	type WinMatrix,
	recordWin,
	winsOf,
	foldComparisons,
	foldRanking
} from './winMatrix';
import { estimateStrengths, rankingLogProb } from './bradleyTerry';

const W = (): WinMatrix => new Map();

describe('winMatrix', () => {
	it('recordWin 누적, winsOf 조회, 방향 구분', () => {
		const m = W();
		recordWin(m, 'a', 'b');
		recordWin(m, 'a', 'b');
		recordWin(m, 'b', 'a');
		expect(winsOf(m, 'a', 'b')).toBe(2);
		expect(winsOf(m, 'b', 'a')).toBe(1);
		expect(winsOf(m, 'a', 'c')).toBe(0);
	});

	it('foldComparisons 는 각 비교를 그대로 폴딩', () => {
		const m = W();
		foldComparisons(m, [
			{ winnerId: 'a', loserId: 'b' },
			{ winnerId: 'a', loserId: 'c' },
			{ winnerId: 'b', loserId: 'c' }
		]);
		expect(winsOf(m, 'a', 'b')).toBe(1);
		expect(winsOf(m, 'a', 'c')).toBe(1);
		expect(winsOf(m, 'b', 'c')).toBe(1);
	});

	it('foldRanking 은 완전 순위를 모든 상하 쌍으로 폴딩', () => {
		const m = W();
		foldRanking(m, ['a', 'b', 'c']); // a>b, a>c, b>c
		expect(winsOf(m, 'a', 'b')).toBe(1);
		expect(winsOf(m, 'a', 'c')).toBe(1);
		expect(winsOf(m, 'b', 'c')).toBe(1);
		expect(winsOf(m, 'b', 'a')).toBe(0);
	});
});

describe('estimateStrengths', () => {
	const ids = ['a', 'b', 'c'];

	it('Σθ=1 로 정규화', () => {
		const m = W();
		foldRanking(m, ids);
		const theta = estimateStrengths(ids, m);
		const sum = ids.reduce((s, id) => s + theta.get(id)!, 0);
		expect(sum).toBeCloseTo(1, 10);
	});

	it('이행적 데이터에서 θ_a > θ_b > θ_c', () => {
		const m = W();
		// a>b, a>c, b>c 를 여러 번 반복
		for (let i = 0; i < 20; i++) foldRanking(m, ids);
		const theta = estimateStrengths(ids, m);
		expect(theta.get('a')!).toBeGreaterThan(theta.get('b')!);
		expect(theta.get('b')!).toBeGreaterThan(theta.get('c')!);
	});

	it('대칭 데이터에서 θ 가 거의 같음', () => {
		const m = W();
		for (let i = 0; i < 10; i++) {
			recordWin(m, 'a', 'b');
			recordWin(m, 'b', 'a');
		}
		const theta = estimateStrengths(['a', 'b'], m);
		expect(theta.get('a')!).toBeCloseTo(theta.get('b')!, 6);
	});

	it('무패 후보가 있어도 ε 덕분에 발산하지 않음(유한·최대)', () => {
		const m = W();
		// a 는 전승, c 는 전패
		for (let i = 0; i < 50; i++) foldRanking(m, ids);
		const theta = estimateStrengths(ids, m);
		for (const id of ids) {
			expect(Number.isFinite(theta.get(id)!)).toBe(true);
			expect(theta.get(id)!).toBeGreaterThan(0);
		}
		expect(theta.get('a')!).toBeGreaterThan(theta.get('c')!);
	});

	it('빈 입력/단일 후보 처리', () => {
		expect(estimateStrengths([], W()).size).toBe(0);
		const one = estimateStrengths(['x'], W());
		expect(one.get('x')).toBe(1);
	});
});

describe('rankingLogProb', () => {
	it('균등 θ 에서 logP = -log(N!)', () => {
		const ids = ['a', 'b', 'c', 'd'];
		const theta = new Map(ids.map((id) => [id, 0.25]));
		const logP = rankingLogProb(ids, theta);
		const logNfact = Math.log(1 * 2 * 3 * 4);
		expect(logP).toBeCloseTo(-logNfact, 10);
	});

	it('모드(최빈) 순위가 뒤집힌 순위보다 확률이 높음(logP 큼)', () => {
		const theta = new Map([
			['a', 0.6],
			['b', 0.3],
			['c', 0.1]
		]);
		const modal = rankingLogProb(['a', 'b', 'c'], theta);
		const reversed = rankingLogProb(['c', 'b', 'a'], theta);
		expect(modal).toBeGreaterThan(reversed);
	});

	it('강도 순서를 그대로 따를수록 덜 희귀(logP 최대)', () => {
		const ids = ['a', 'b', 'c'];
		const m = W();
		for (let i = 0; i < 30; i++) foldRanking(m, ids);
		const theta = estimateStrengths(ids, m);
		const best = rankingLogProb(['a', 'b', 'c'], theta);
		const other = rankingLogProb(['b', 'a', 'c'], theta);
		expect(best).toBeGreaterThan(other);
	});
});
