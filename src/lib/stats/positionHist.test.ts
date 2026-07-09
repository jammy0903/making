import { describe, it, expect } from 'vitest';
import {
	type PositionHist,
	foldPosition,
	firstPlaceCount,
	appearances,
	firstPlaceRate,
	avgNorm
} from './positionHist';

const H = (): PositionHist => new Map();

describe('positionHist', () => {
	it('foldPosition 이 각 후보를 자기 순위 칸에 누적', () => {
		const h = H();
		foldPosition(h, ['a', 'b', 'c']);
		foldPosition(h, ['b', 'a', 'c']);
		expect(firstPlaceCount(h, 'a')).toBe(1);
		expect(firstPlaceCount(h, 'b')).toBe(1);
		expect(firstPlaceCount(h, 'c')).toBe(0);
		expect(appearances(h, 'a')).toBe(2);
		expect(appearances(h, 'c')).toBe(2);
	});

	it('firstPlaceRate 는 등장 대비 1위 비율', () => {
		const h = H();
		foldPosition(h, ['a', 'b']);
		foldPosition(h, ['a', 'b']);
		foldPosition(h, ['b', 'a']);
		expect(firstPlaceRate(h, 'a')).toBeCloseTo(2 / 3, 10);
		expect(firstPlaceRate(h, 'b')).toBeCloseTo(1 / 3, 10);
		expect(firstPlaceRate(h, 'z')).toBe(0);
	});

	it('avgNorm: 항상 1위=0, 항상 꼴찌=1', () => {
		const h = H();
		foldPosition(h, ['a', 'b', 'c']);
		foldPosition(h, ['a', 'c', 'b']);
		expect(avgNorm(h, 'a')).toBeCloseTo(0, 10); // 두 번 다 pos0
		expect(avgNorm(h, 'b')).toBeCloseTo((0.5 + 1) / 2, 10); // pos1,pos2 → (0.5+1)/2
	});

	it('avgNorm: 관측 없음/단일 후보는 null', () => {
		const h = H();
		expect(avgNorm(h, 'x')).toBeNull();
		foldPosition(h, ['solo']);
		expect(avgNorm(h, 'solo')).toBeNull(); // N=1
	});

	it('후보 수가 커진 주제에서 행을 확장하며 기존 카운트 보존', () => {
		const h = H();
		foldPosition(h, ['a', 'b']); // N=2, a→pos0
		foldPosition(h, ['c', 'a', 'b']); // N=3, a→pos1
		expect(firstPlaceCount(h, 'a')).toBe(1); // 첫 폴딩의 pos0 보존
		expect(appearances(h, 'a')).toBe(2);
		const row = h.get('a')!;
		expect(row.length).toBe(3);
		expect(row[0]).toBe(1); // pos0 한 번
		expect(row[1]).toBe(1); // pos1 한 번
	});
});
